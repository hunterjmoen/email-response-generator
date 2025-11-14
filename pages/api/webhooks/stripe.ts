import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import { stripe } from '../../../server/lib/stripe';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Create admin Supabase client for database updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Helper function to determine tier from subscription
function getTierFromSubscription(subscription: Stripe.Subscription): {
  tier: 'free' | 'professional' | 'premium';
  monthlyLimit: number;
} {
  const priceId = subscription.items.data[0]?.price.id;
  
  const professionalMonthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID;
  const professionalAnnualPriceId = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID;
  const premiumMonthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID;
  const premiumAnnualPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_ANNUAL_PRICE_ID;

  // Check if it's a professional tier subscription
  if (priceId === professionalMonthlyPriceId || priceId === professionalAnnualPriceId) {
    return { tier: 'professional', monthlyLimit: 75 };
  }

  // Check if it's a premium tier subscription
  if (priceId === premiumMonthlyPriceId || priceId === premiumAnnualPriceId) {
    return { tier: 'premium', monthlyLimit: 999999 };
  }

  // Default to premium for backward compatibility with existing subscriptions
  console.warn(`Unknown price ID: ${priceId}, defaulting to premium tier`);
  return { tier: 'premium', monthlyLimit: 999999 };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  if (!sig || !webhookSecret) {
    console.error('Missing stripe signature or webhook secret');
    return res.status(400).json({ error: 'Missing signature or secret' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    const error = err as Error;
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log('Checkout session completed:', session.id);

  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('No userId in session metadata');
    return;
  }

  try {
    // Fetch subscription to get price information
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    const { tier, monthlyLimit } = getTierFromSubscription(subscription);

    // Extract IDs as strings (not full objects)
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    // Update subscription in database
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        tier,
        status: 'active',
        monthly_limit: monthlyLimit,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }

    console.log(`Successfully updated subscription for user ${userId} to ${tier} tier`);
  } catch (error) {
    console.error('Failed to update subscription in database:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  try {
    const { tier, monthlyLimit } = getTierFromSubscription(subscription);

    // Ensure we're storing the subscription ID as a string
    const subscriptionId = typeof subscription.id === 'string' ? subscription.id : String(subscription.id);

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        stripe_subscription_id: subscriptionId,
        status: subscription.status,
        tier,
        monthly_limit: monthlyLimit,
        usage_reset_date: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }

    console.log(`Subscription created for user ${userId} with ${tier} tier`);
  } catch (error) {
    console.error('Failed to create subscription in database:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  try {
    // Get the tier and limit from the subscription (in case it changed)
    const { tier, monthlyLimit } = getTierFromSubscription(subscription);

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: subscription.status,
        tier,
        monthly_limit: monthlyLimit,
        usage_reset_date: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }

    console.log(`Subscription updated for user ${userId}, tier: ${tier}, status: ${subscription.status}`);
  } catch (error) {
    console.error('Failed to update subscription in database:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  try {
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        tier: 'free',
        monthly_limit: 10,
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }

    console.log(`Subscription cancelled for user ${userId}`);
  } catch (error) {
    console.error('Failed to cancel subscription in database:', error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id);

  // For recurring payments, ensure subscription remains active
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription as string
    );

    const userId = subscription.metadata?.userId;
    if (userId) {
      try {
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating subscription after payment:', error);
        }
      } catch (error) {
        console.error('Failed to update subscription after payment:', error);
      }
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id);

  // Mark subscription as past_due
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription as string
    );

    const userId = subscription.metadata?.userId;
    if (userId) {
      try {
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating subscription after failed payment:', error);
        }
      } catch (error) {
        console.error('Failed to update subscription after failed payment:', error);
      }
    }
  }
}

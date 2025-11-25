import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import { stripe } from '../../../server/lib/stripe';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { devLog, logError, logWarning } from '../../../utils/logger';

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

// Helper function to determine tier and billing interval from subscription
function getTierFromSubscription(subscription: Stripe.Subscription): {
  tier: 'free' | 'professional' | 'premium';
  monthlyLimit: number;
  billing_interval: 'monthly' | 'annual';
} {
  const priceId = subscription.items.data[0]?.price.id;

  const professionalMonthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID;
  const professionalAnnualPriceId = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID;
  const premiumMonthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID;
  const premiumAnnualPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_ANNUAL_PRICE_ID;

  // Check if it's a professional tier subscription
  if (priceId === professionalMonthlyPriceId) {
    return { tier: 'professional', monthlyLimit: 75, billing_interval: 'monthly' };
  }
  if (priceId === professionalAnnualPriceId) {
    return { tier: 'professional', monthlyLimit: 75, billing_interval: 'annual' };
  }

  // Check if it's a premium tier subscription
  if (priceId === premiumMonthlyPriceId) {
    return { tier: 'premium', monthlyLimit: 999999, billing_interval: 'monthly' };
  }
  if (priceId === premiumAnnualPriceId) {
    return { tier: 'premium', monthlyLimit: 999999, billing_interval: 'annual' };
  }

  // Default to premium monthly for backward compatibility with existing subscriptions
  logWarning('Unknown price ID, defaulting to premium tier', { priceId });
  return { tier: 'premium', monthlyLimit: 999999, billing_interval: 'monthly' };
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
    logError(new Error('Missing stripe signature or webhook secret'), { context: 'Stripe webhook' });
    return res.status(400).json({ error: 'Missing signature or secret' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    const error = err as Error;
    logError(error, { context: 'Webhook signature verification' });
    return res.status(400).json({ error: 'Webhook signature verification failed' });
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
        devLog.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logError(error, { context: 'Process webhook' });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  devLog.log('Checkout session completed');

  const userId = session.metadata?.userId;
  if (!userId) {
    logWarning('No userId in session metadata', { sessionId: session.id });
    return;
  }

  try {
    // Fetch subscription to get price information
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    const { tier, monthlyLimit, billing_interval } = getTierFromSubscription(subscription);

    // Extract IDs as strings (not full objects)
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    // Check if this is a trial subscription
    const isTrialing = subscription.status === 'trialing';

    // Fetch existing subscription to preserve has_used_trial if already true
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('has_used_trial')
      .eq('user_id', userId)
      .single();

    // Update subscription in database
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        tier,
        status: subscription.status,
        monthly_limit: monthlyLimit,
        billing_interval,
        has_used_trial: isTrialing || existingSubscription?.has_used_trial || false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      logError(error, { context: 'Update subscription after checkout' });
      throw error;
    }

    devLog.log(`Successfully updated subscription for user to ${tier} tier`);
  } catch (error) {
    logError(error, { context: 'Handle checkout session completed' });
    throw error;
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  devLog.log('Subscription created');

  const userId = subscription.metadata?.userId;
  if (!userId) {
    logWarning('No userId in subscription metadata', { subscriptionId: subscription.id });
    return;
  }

  try {
    const { tier, monthlyLimit, billing_interval } = getTierFromSubscription(subscription);

    // Ensure we're storing the subscription ID as a string
    const subscriptionId = typeof subscription.id === 'string' ? subscription.id : String(subscription.id);

    // Check if this is a trial subscription
    const isTrialing = subscription.status === 'trialing';

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        stripe_subscription_id: subscriptionId,
        status: subscription.status,
        tier,
        monthly_limit: monthlyLimit,
        billing_interval,
        has_used_trial: isTrialing,
        usage_reset_date: new Date(((subscription as any).current_period_end || 0) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      logError(error, { context: 'Create subscription in database' });
      throw error;
    }

    devLog.log(`Subscription created for user with ${tier} tier`);
  } catch (error) {
    logError(error, { context: 'Handle subscription created' });
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  devLog.log('[Webhook] Subscription updated');

  const userId = subscription.metadata?.userId;
  if (!userId) {
    logWarning('No userId in subscription metadata for update', { subscriptionId: subscription.id });
    return;
  }

  try {
    // Get the tier, limit, and billing interval from the subscription (in case it changed)
    const { tier, monthlyLimit, billing_interval } = getTierFromSubscription(subscription);

    devLog.log(`[Webhook] Updating user to tier: ${tier}, status: ${subscription.status}`);

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: subscription.status,
        tier,
        monthly_limit: monthlyLimit,
        billing_interval,
        usage_reset_date: new Date(((subscription as any).current_period_end || 0) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      logError(error, { context: 'Update subscription in database' });
      throw error;
    }

    devLog.log(`[Webhook Success] Subscription updated, tier: ${tier}, status: ${subscription.status}`);
  } catch (error) {
    logError(error, { context: 'Handle subscription updated' });
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  devLog.log('[Webhook] Subscription deleted');

  const userId = subscription.metadata?.userId;
  if (!userId) {
    logWarning('No userId in subscription metadata for deletion', { subscriptionId: subscription.id });
    return;
  }

  try {
    devLog.log('[Webhook] Cancelling subscription, resetting to free tier');

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        tier: 'free',
        monthly_limit: 10,
        stripe_subscription_id: null,
        billing_interval: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      logError(error, { context: 'Cancel subscription in database' });
      throw error;
    }

    devLog.log('[Webhook Success] Subscription cancelled, reset to free tier');
  } catch (error) {
    logError(error, { context: 'Handle subscription deleted' });
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  devLog.log('Invoice payment succeeded');

  // For recurring payments, ensure subscription remains active
  if ((invoice as any).subscription && typeof (invoice as any).subscription === 'string') {
    const subscription = await stripe.subscriptions.retrieve(
      (invoice as any).subscription
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
          logError(error, { context: 'Update subscription after payment' });
        }
      } catch (error) {
        logError(error, { context: 'Handle payment succeeded' });
      }
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  devLog.log('Invoice payment failed');

  // Mark subscription as past_due
  if ((invoice as any).subscription && typeof (invoice as any).subscription === 'string') {
    const subscription = await stripe.subscriptions.retrieve(
      (invoice as any).subscription
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
          logError(error, { context: 'Update subscription after failed payment' });
        }
      } catch (error) {
        logError(error, { context: 'Handle payment failed' });
      }
    }
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '../../../server/lib/stripe';

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

/**
 * Admin endpoint to backfill stripe_customer_id for existing subscriptions
 * This is useful for subscriptions created before the field was properly populated
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple authentication - you can enhance this
  const { adminKey } = req.body;
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all subscriptions that have stripe_subscription_id but missing stripe_customer_id
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, stripe_subscription_id, stripe_customer_id')
      .not('stripe_subscription_id', 'is', null)
      .is('stripe_customer_id', null);

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({
        message: 'No subscriptions need fixing',
        fixed: 0
      });
    }

    const results = [];
    let fixedCount = 0;

    // For each subscription, fetch the Stripe subscription and get the customer ID
    for (const sub of subscriptions) {
      try {
        if (!sub.stripe_subscription_id) continue;

        // Fetch subscription from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(
          sub.stripe_subscription_id
        );

        const customerId = typeof stripeSubscription.customer === 'string'
          ? stripeSubscription.customer
          : stripeSubscription.customer.id;

        // Update the database with the customer ID
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sub.id);

        if (updateError) {
          console.error(`Error updating subscription ${sub.id}:`, updateError);
          results.push({
            user_id: sub.user_id,
            subscription_id: sub.id,
            status: 'error',
            error: updateError.message
          });
        } else {
          fixedCount++;
          results.push({
            user_id: sub.user_id,
            subscription_id: sub.id,
            stripe_customer_id: customerId,
            status: 'success'
          });
        }
      } catch (error: any) {
        console.error(`Error processing subscription ${sub.id}:`, error);
        results.push({
          user_id: sub.user_id,
          subscription_id: sub.id,
          status: 'error',
          error: error.message
        });
      }
    }

    return res.status(200).json({
      message: `Fixed ${fixedCount} out of ${subscriptions.length} subscriptions`,
      fixed: fixedCount,
      total: subscriptions.length,
      results
    });
  } catch (error: any) {
    console.error('Error in fix-subscription-stripe-ids:', error);
    return res.status(500).json({
      error: 'Failed to fix subscriptions',
      details: error.message
    });
  }
}

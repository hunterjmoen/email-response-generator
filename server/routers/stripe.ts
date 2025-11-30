import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { stripe } from '../lib/stripe';
import { TRPCError } from '@trpc/server';
import type Stripe from 'stripe';
import { devLog, logError, logWarning } from '../../utils/logger';

// Helper function to determine tier and billing interval from subscription
function getTierFromSubscription(subscription: Stripe.Subscription): {
  tier: 'free' | 'professional' | 'premium';
  monthlyLimit: number;
  billing_interval: 'monthly' | 'annual';
} {
  // Get price ID - handle both string and object formats
  const priceItem = subscription.items.data[0]?.price;
  const priceId = typeof priceItem === 'string' ? priceItem : priceItem?.id;

  devLog.log('[getTierFromSubscription] Price ID:', priceId);

  if (!priceId) {
    logWarning('No price ID found in subscription, defaulting to premium tier');
    return { tier: 'premium', monthlyLimit: 999999, billing_interval: 'monthly' };
  }

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

export const stripeRouter = router({
  /**
   * Create a checkout session for one-time payments
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        priceId: z.string(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
        metadata: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get or create Stripe customer for this user
        let customerId: string | undefined;

        // Check if user already has a Stripe customer ID in the database
        const { data: existingSubscription } = await ctx.supabase
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', ctx.user.id)
          .single();

        if (existingSubscription?.stripe_customer_id) {
          customerId = existingSubscription.stripe_customer_id;
          devLog.log('[Stripe] Using existing customer for payment');
        }

        // Generate idempotency key to prevent duplicate charges
        const idempotencyKey = `payment_${ctx.user.id}_${input.priceId}_${Date.now()}`;

        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          customer: customerId,
          customer_email: customerId ? undefined : ctx.user.email,
          line_items: [
            {
              price: input.priceId,
              quantity: 1,
            },
          ],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          metadata: {
            userId: ctx.user.id,
            ...input.metadata,
          },
        }, {
          idempotencyKey,
        });

        return {
          sessionId: session.id,
          url: session.url,
        };
      } catch (error) {
        logError(error, { context: 'Stripe checkout session creation' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create checkout session',
        });
      }
    }),

  /**
   * Create a subscription checkout session
   */
  createSubscriptionSession: protectedProcedure
    .input(
      z.object({
        priceId: z.string(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
        trialPeriodDays: z.number().optional(),
        metadata: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get or create Stripe customer for this user
        let customerId: string;

        // Check if user already has a Stripe customer ID and trial status in the database
        const { data: existingSubscription } = await ctx.supabase
          .from('subscriptions')
          .select('stripe_customer_id, has_used_trial')
          .eq('user_id', ctx.user.id)
          .single();

        if (existingSubscription?.stripe_customer_id) {
          // Verify the customer exists in Stripe before using it
          try {
            await stripe.customers.retrieve(existingSubscription.stripe_customer_id);
            customerId = existingSubscription.stripe_customer_id;
            devLog.log('[Stripe] Using existing customer');
          } catch {
            // Customer doesn't exist in Stripe, create a new one
            devLog.log('[Stripe] Existing customer invalid, creating new');
            const customer = await stripe.customers.create({
              email: ctx.user.email,
              metadata: {
                userId: ctx.user.id,
              },
              name: `${ctx.user.firstName} ${ctx.user.lastName}`.trim() || undefined,
            });
            customerId = customer.id;
            devLog.log('[Stripe] Created new customer');

            // Update the database with the new customer ID
            await ctx.supabase
              .from('subscriptions')
              .update({ stripe_customer_id: customerId })
              .eq('user_id', ctx.user.id);
          }
        } else {
          // Create new Stripe customer
          const customer = await stripe.customers.create({
            email: ctx.user.email,
            metadata: {
              userId: ctx.user.id,
            },
            name: `${ctx.user.firstName} ${ctx.user.lastName}`.trim() || undefined,
          });
          customerId = customer.id;
          devLog.log('[Stripe] Created new customer');
        }

        // Generate idempotency key to prevent duplicate sessions
        const idempotencyKey = `subscription_${ctx.user.id}_${input.priceId}_${Date.now()}`;

        // Only apply trial period if user hasn't already used their free trial
        const trialDays = existingSubscription?.has_used_trial ? undefined : input.trialPeriodDays;

        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          customer: customerId,
          line_items: [
            {
              price: input.priceId,
              quantity: 1,
            },
          ],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          billing_address_collection: 'auto',
          allow_promotion_codes: true,
          payment_method_collection: 'always',
          // Disable Stripe Link to skip account creation
          consent_collection: {
            terms_of_service: 'none',
          },
          subscription_data: {
            trial_period_days: trialDays,
            metadata: {
              userId: ctx.user.id,
              email: ctx.user.email,
              ...input.metadata,
            },
          },
          metadata: {
            userId: ctx.user.id,
            email: ctx.user.email,
            ...input.metadata,
          },
        }, {
          idempotencyKey,
        });

        return {
          sessionId: session.id,
          url: session.url,
        };
      } catch (error) {
        logError(error, { context: 'Stripe subscription session creation' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create subscription session',
        });
      }
    }),

  /**
   * Create a billing portal session for managing subscriptions
   */
  createPortalSession: protectedProcedure
    .input(
      z.object({
        returnUrl: z.string().url(),
        customerId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: input.customerId,
          return_url: input.returnUrl,
        });

        return {
          url: session.url,
        };
      } catch (error) {
        logError(error, { context: 'Stripe portal session creation' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create portal session',
        });
      }
    }),

  /**
   * Get customer's payment methods
   */
  getPaymentMethods: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: input.customerId,
          type: 'card',
        });

        return paymentMethods.data;
      } catch (error) {
        logError(error, { context: 'Retrieve payment methods' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve payment methods',
        });
      }
    }),

  /**
   * Get customer's subscriptions
   */
  getSubscriptions: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: input.customerId,
          status: 'all',
          expand: ['data.default_payment_method'],
        });

        return subscriptions.data;
      } catch (error) {
        logError(error, { context: 'Retrieve subscriptions' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve subscriptions',
        });
      }
    }),

  /**
   * Cancel a subscription
   */
  cancelSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        cancelAtPeriodEnd: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const subscription = await stripe.subscriptions.update(
          input.subscriptionId,
          {
            cancel_at_period_end: input.cancelAtPeriodEnd,
          }
        );

        // Immediately update the database (optimistic update)
        // Note: Subscription stays active until period end when cancelAtPeriodEnd is true
        // The webhook will handle the final transition to 'cancelled' when the subscription actually ends
        if (subscription.cancel_at_period_end) {
          const { error: dbError } = await ctx.supabase
            .from('subscriptions')
            .update({
              status: 'active', // Still active until period ends
              cancel_at_period_end: true,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', ctx.user.id);

          if (dbError) {
            logError(dbError, { context: 'Update database after subscription cancellation' });
            // Don't throw - webhook will reconcile later
          }
        }

        return subscription;
      } catch (error) {
        logError(error, { context: 'Cancel subscription' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel subscription',
        });
      }
    }),

  /**
   * Update a subscription to a new price/tier
   */
  updateSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        newPriceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        devLog.log('[updateSubscription] Starting update');

        // Get the current subscription
        const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
        devLog.log('[updateSubscription] Current subscription retrieved');

        // Update the subscription with the new price
        // Also reset cancel_at_period_end to false in case user is resubscribing
        const updatedSubscription = await stripe.subscriptions.update(
          input.subscriptionId,
          {
            items: [
              {
                id: subscription.items.data[0].id,
                price: input.newPriceId,
              },
            ],
            proration_behavior: 'create_prorations',
            cancel_at_period_end: false,
          }
        );
        devLog.log('[updateSubscription] Stripe subscription updated successfully');

        // Immediately update the database (optimistic update)
        // Webhook will confirm and reconcile later
        const { tier, monthlyLimit, billing_interval } = getTierFromSubscription(updatedSubscription);
        const nextBillingDate = (updatedSubscription as any).current_period_end
          ? new Date(((updatedSubscription as any).current_period_end || 0) * 1000).toISOString()
          : new Date().toISOString();

        devLog.log('[updateSubscription] Updating database');

        const { error: dbError } = await ctx.supabase
          .from('subscriptions')
          .update({
            tier,
            monthly_limit: monthlyLimit,
            billing_interval,
            status: updatedSubscription.status as 'active' | 'cancelled' | 'past_due' | 'expired' | 'trialing',
            usage_reset_date: nextBillingDate,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', ctx.user.id);

        if (dbError) {
          logError(dbError, { context: 'Update subscription database' });
          // Don't throw - webhook will reconcile later
        } else {
          devLog.log('[updateSubscription] Database updated successfully');
        }

        return updatedSubscription;
      } catch (error: unknown) {
        logError(error, { context: 'Update subscription' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update subscription',
        });
      }
    }),

  /**
   * Switch billing cycle (monthly <-> annual) for same tier
   */
  switchBillingCycle: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        newPriceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        devLog.log('[switchBillingCycle] Starting switch');

        // Get the current subscription
        const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
        devLog.log('[switchBillingCycle] Current subscription retrieved');

        // Determine current and target billing intervals
        const currentPriceId = subscription.items.data[0]?.price.id;
        const { billing_interval: currentInterval } = getTierFromSubscription(subscription);

        // Check if this is annual→monthly switch (not allowed mid-cycle)
        const professionalMonthly = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID;
        const premiumMonthly = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID;
        const isTargetMonthly = input.newPriceId === professionalMonthly || input.newPriceId === premiumMonthly;

        if (currentInterval === 'annual' && isTargetMonthly) {
          const periodEnd = new Date(((subscription as any).current_period_end || 0) * 1000);
          devLog.log('[switchBillingCycle] Blocking annual→monthly mid-cycle switch');
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Your annual plan is active through ${periodEnd.toLocaleDateString()}. You can switch to monthly billing when your plan renews.`,
          });
        }

        // Update the subscription with the new billing cycle
        // Also reset cancel_at_period_end in case user is resubscribing
        const updatedSubscription = await stripe.subscriptions.update(
          input.subscriptionId,
          {
            items: [
              {
                id: subscription.items.data[0].id,
                price: input.newPriceId,
              },
            ],
            proration_behavior: 'create_prorations',
            cancel_at_period_end: false,
          }
        );
        devLog.log('[switchBillingCycle] Stripe subscription updated successfully');

        // Update database with new billing interval
        const { tier, monthlyLimit, billing_interval } = getTierFromSubscription(updatedSubscription);
        const nextBillingDate = (updatedSubscription as any).current_period_end
          ? new Date(((updatedSubscription as any).current_period_end || 0) * 1000).toISOString()
          : new Date().toISOString();

        devLog.log('[switchBillingCycle] Updating database');

        const { error: dbError } = await ctx.supabase
          .from('subscriptions')
          .update({
            tier,
            monthly_limit: monthlyLimit,
            billing_interval,
            status: updatedSubscription.status as 'active' | 'cancelled' | 'past_due' | 'expired' | 'trialing',
            usage_reset_date: nextBillingDate,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', ctx.user.id);

        if (dbError) {
          logError(dbError, { context: 'Switch billing cycle database update' });
        } else {
          devLog.log('[switchBillingCycle] Database updated successfully');
        }

        return updatedSubscription;
      } catch (error: unknown) {
        if (error instanceof TRPCError) {
          throw error;
        }
        logError(error, { context: 'Switch billing cycle' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to switch billing cycle',
        });
      }
    }),

  /**
   * Preview proration for a subscription change
   * Returns the amount the user will be charged or credited
   */
  previewProration: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        newPriceId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        devLog.log('[previewProration] Previewing proration');

        // Get the current subscription
        const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);

        // Get the current and new prices for display
        const currentPriceId = subscription.items.data[0]?.price.id;
        const [currentPrice, newPrice] = await Promise.all([
          stripe.prices.retrieve(currentPriceId),
          stripe.prices.retrieve(input.newPriceId),
        ]);

        // Create an invoice preview to see what the proration would be
        const invoicePreview = await stripe.invoices.createPreview({
          customer: subscription.customer as string,
          subscription: input.subscriptionId,
          subscription_details: {
            items: [
              {
                id: subscription.items.data[0].id,
                price: input.newPriceId,
              },
            ],
            proration_behavior: 'create_prorations',
          },
        });

        // Calculate the proration amount
        // Find proration line items (they have type 'invoiceitem' with proration)
        const prorationItems = invoicePreview.lines.data.filter(
          (line) => (line as any).proration === true
        );

        // Sum up the proration amounts
        const prorationAmount = prorationItems.reduce(
          (sum, item) => sum + item.amount,
          0
        );

        // Get period end date
        const periodEnd = new Date((subscription as any).current_period_end * 1000);

        // Determine if this is an upgrade or downgrade
        const currentAmount = currentPrice.unit_amount || 0;
        const newAmount = newPrice.unit_amount || 0;
        const isUpgrade = newAmount > currentAmount;

        // Get human-readable tier names
        const getTierName = (priceId: string): string => {
          const professionalMonthly = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID;
          const professionalAnnual = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID;
          const premiumMonthly = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID;
          const premiumAnnual = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_ANNUAL_PRICE_ID;

          if (priceId === professionalMonthly || priceId === professionalAnnual) {
            return 'Professional';
          }
          if (priceId === premiumMonthly || priceId === premiumAnnual) {
            return 'Premium';
          }
          return 'Unknown';
        };

        const getBillingInterval = (priceId: string): 'monthly' | 'annual' => {
          const professionalAnnual = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID;
          const premiumAnnual = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_ANNUAL_PRICE_ID;
          return (priceId === professionalAnnual || priceId === premiumAnnual) ? 'annual' : 'monthly';
        };

        return {
          // Amounts in cents
          prorationAmount, // Positive = charge, negative = credit
          currentPriceAmount: currentAmount,
          newPriceAmount: newAmount,
          // For display
          prorationAmountFormatted: (Math.abs(prorationAmount) / 100).toFixed(2),
          currentPriceFormatted: (currentAmount / 100).toFixed(2),
          newPriceFormatted: (newAmount / 100).toFixed(2),
          // Metadata
          isUpgrade,
          isCredit: prorationAmount < 0,
          periodEnd: periodEnd.toISOString(),
          currentTier: getTierName(currentPriceId),
          newTier: getTierName(input.newPriceId),
          currentInterval: getBillingInterval(currentPriceId),
          newInterval: getBillingInterval(input.newPriceId),
          // Invoice total (what will be charged now, if anything)
          invoiceTotal: invoicePreview.total,
          invoiceTotalFormatted: (invoicePreview.total / 100).toFixed(2),
          // Amount due now vs at next billing
          amountDueNow: invoicePreview.amount_due,
          amountDueNowFormatted: (invoicePreview.amount_due / 100).toFixed(2),
        };
      } catch (error: unknown) {
        logError(error, { context: 'Preview proration' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to preview proration',
        });
      }
    }),

  /**
   * Get available prices/plans
   */
  getPrices: protectedProcedure.query(async () => {
    try {
      const prices = await stripe.prices.list({
        active: true,
        expand: ['data.product'],
      });

      return prices.data;
    } catch (error) {
      logError(error, { context: 'Retrieve prices' });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve prices',
      });
    }
  }),

  /**
   * Verify and activate subscription after checkout
   * Used as fallback when webhooks haven't processed yet.
   * In production, webhooks handle this automatically.
   */
  verifyCheckoutSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // In production, only allow if webhook hasn't processed yet (acts as fallback)
      // This prevents abuse while still allowing the endpoint for webhook race conditions
      if (process.env.NODE_ENV === 'production') {
        const { data: existingSub } = await ctx.supabase
          .from('subscriptions')
          .select('stripe_subscription_id, status')
          .eq('user_id', ctx.user.id)
          .single();

        // If webhook already processed this subscription, return early
        if (existingSub?.stripe_subscription_id && existingSub.status === 'active') {
          devLog.log('[verifyCheckout] Subscription already active via webhook');
          return { success: true, alreadyProcessed: true };
        }
      }

      try {
        devLog.log('[verifyCheckout] Verifying checkout session');

        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
          expand: ['subscription', 'customer'],
        });

        devLog.log('[verifyCheckout] Session retrieved');

        // Verify the session belongs to this user
        if (session.metadata?.userId !== ctx.user.id) {
          logWarning('Checkout session user mismatch attempt');
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This checkout session does not belong to you',
          });
        }

        // Verify payment was successful
        if (session.payment_status !== 'paid') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Payment not completed',
          });
        }

        // Determine tier from subscription
        // Extract subscription ID - session.subscription is already expanded as an object
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as any)?.id;

        // Extract customer ID - session.customer may be expanded as an object
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : (session.customer as any)?.id;

        devLog.log('[verifyCheckout] Extracted IDs');

        if (!subscriptionId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No subscription found in checkout session',
          });
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        devLog.log('[verifyCheckout] Subscription retrieved');

        const priceId = subscription.items.data[0]?.price.id;
        const priceInterval = subscription.items.data[0]?.price.recurring?.interval;
        let tier: 'free' | 'professional' | 'premium' = 'premium';
        let monthlyLimit = 999999;

        const professionalMonthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID;
        const professionalAnnualPriceId = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID;

        if (priceId === professionalMonthlyPriceId || priceId === professionalAnnualPriceId) {
          tier = 'professional';
          monthlyLimit = 75;
        }

        // Determine billing interval from price
        const billingInterval = priceInterval === 'year' ? 'annual' : 'monthly';

        // Safely get usage_reset_date from subscription period end
        const periodEnd = (subscription as any).current_period_end;
        const usageResetDate = periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default to 30 days from now

        devLog.log('[verifyCheckout] Updating database');

        // Update subscription in database
        const { error } = await ctx.supabase
          .from('subscriptions')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            tier,
            status: 'active',
            monthly_limit: monthlyLimit,
            billing_interval: billingInterval,
            cancel_at_period_end: false,
            usage_reset_date: usageResetDate,
            has_used_trial: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', ctx.user.id);

        if (error) {
          logError(error, { context: 'Activate subscription' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to activate subscription',
          });
        }

        devLog.log('[verifyCheckout] Successfully activated subscription');

        return {
          success: true,
          tier,
          status: 'active',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        logError(error, { context: 'Verify checkout session' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify checkout session',
        });
      }
    }),

  /**
   * Schedule a downgrade to take effect at end of billing period
   * Uses Stripe subscription schedules to defer the price change
   */
  scheduleDowngrade: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        newPriceId: z.string(),
        newTier: z.enum(['free', 'professional', 'premium']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        devLog.log('[scheduleDowngrade] Starting scheduled downgrade');

        // Get the current subscription
        const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
        const periodEnd = (subscription as any).current_period_end;
        const periodEndDate = new Date(periodEnd * 1000);

        devLog.log('[scheduleDowngrade] Period end:', periodEndDate.toISOString());

        // For downgrade to free tier, we cancel at period end
        if (input.newTier === 'free') {
          await stripe.subscriptions.update(input.subscriptionId, {
            cancel_at_period_end: true,
          });
          devLog.log('[scheduleDowngrade] Set cancel_at_period_end for free tier downgrade');
        } else {
          // For downgrades to paid tiers, use subscription schedule
          // First, check if there's already a schedule
          let schedule = subscription.schedule
            ? await stripe.subscriptionSchedules.retrieve(subscription.schedule as string)
            : null;

          if (!schedule) {
            // Create a schedule from the existing subscription
            schedule = await stripe.subscriptionSchedules.create({
              from_subscription: input.subscriptionId,
            });
            devLog.log('[scheduleDowngrade] Created new subscription schedule');
          }

          // Update the schedule to change price at period end
          await stripe.subscriptionSchedules.update(schedule.id, {
            end_behavior: 'release',
            phases: [
              {
                items: [
                  {
                    price: subscription.items.data[0].price.id,
                    quantity: 1,
                  },
                ],
                start_date: (subscription as any).current_period_start,
                end_date: periodEnd,
              },
              {
                items: [
                  {
                    price: input.newPriceId,
                    quantity: 1,
                  },
                ],
                start_date: periodEnd,
                proration_behavior: 'none',
              },
            ],
          });
          devLog.log('[scheduleDowngrade] Updated subscription schedule with new phase');
        }

        // Store scheduled downgrade in database
        const { error: dbError } = await ctx.supabase
          .from('subscriptions')
          .update({
            scheduled_tier: input.newTier,
            scheduled_tier_change_date: periodEndDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', ctx.user.id);

        if (dbError) {
          logError(dbError, { context: 'Store scheduled downgrade in database' });
        }

        devLog.log('[scheduleDowngrade] Downgrade scheduled successfully');

        return {
          success: true,
          scheduledTier: input.newTier,
          effectiveDate: periodEndDate.toISOString(),
        };
      } catch (error) {
        logError(error, { context: 'Schedule downgrade' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to schedule downgrade',
        });
      }
    }),

  /**
   * Cancel a scheduled downgrade
   */
  cancelScheduledDowngrade: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        devLog.log('[cancelScheduledDowngrade] Cancelling scheduled downgrade');

        // Get the current subscription
        const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);

        // If there's a cancel_at_period_end set (downgrade to free), unset it
        if (subscription.cancel_at_period_end) {
          await stripe.subscriptions.update(input.subscriptionId, {
            cancel_at_period_end: false,
          });
          devLog.log('[cancelScheduledDowngrade] Removed cancel_at_period_end');
        }

        // If there's a subscription schedule, release it
        if (subscription.schedule) {
          await stripe.subscriptionSchedules.release(subscription.schedule as string);
          devLog.log('[cancelScheduledDowngrade] Released subscription schedule');
        }

        // Clear scheduled downgrade from database
        const { error: dbError } = await ctx.supabase
          .from('subscriptions')
          .update({
            scheduled_tier: null,
            scheduled_tier_change_date: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', ctx.user.id);

        if (dbError) {
          logError(dbError, { context: 'Clear scheduled downgrade from database' });
        }

        devLog.log('[cancelScheduledDowngrade] Scheduled downgrade cancelled');

        return { success: true };
      } catch (error) {
        logError(error, { context: 'Cancel scheduled downgrade' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel scheduled downgrade',
        });
      }
    }),
});

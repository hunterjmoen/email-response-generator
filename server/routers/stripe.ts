import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { stripe } from '../lib/stripe';
import { TRPCError } from '@trpc/server';
import type Stripe from 'stripe';

// Helper function to determine tier and billing interval from subscription
function getTierFromSubscription(subscription: Stripe.Subscription): {
  tier: 'free' | 'professional' | 'premium';
  monthlyLimit: number;
  billing_interval: 'monthly' | 'annual';
} {
  // Get price ID - handle both string and object formats
  const priceItem = subscription.items.data[0]?.price;
  const priceId = typeof priceItem === 'string' ? priceItem : priceItem?.id;

  console.log('[getTierFromSubscription] Price ID:', priceId);

  if (!priceId) {
    console.warn('[getTierFromSubscription] No price ID found in subscription, defaulting to premium tier');
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
  console.warn(`Unknown price ID: ${priceId}, defaulting to premium tier`);
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
          console.log('Using existing Stripe customer for payment:', customerId);
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
        console.error('Stripe checkout session creation failed:', error);
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

        // Check if user already has a Stripe customer ID in the database
        const { data: existingSubscription } = await ctx.supabase
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', ctx.user.id)
          .single();

        if (existingSubscription?.stripe_customer_id) {
          // Verify the customer exists in Stripe before using it
          try {
            await stripe.customers.retrieve(existingSubscription.stripe_customer_id);
            customerId = existingSubscription.stripe_customer_id;
            console.log('Using existing Stripe customer:', customerId);
          } catch (error) {
            // Customer doesn't exist in Stripe, create a new one
            console.log('Existing customer ID invalid, creating new customer');
            const customer = await stripe.customers.create({
              email: ctx.user.email,
              metadata: {
                userId: ctx.user.id,
              },
              name: `${ctx.user.firstName} ${ctx.user.lastName}`.trim() || undefined,
            });
            customerId = customer.id;
            console.log('Created new Stripe customer:', customerId);

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
          console.log('Created new Stripe customer:', customerId);
        }

        // Generate idempotency key to prevent duplicate sessions
        const idempotencyKey = `subscription_${ctx.user.id}_${input.priceId}_${Date.now()}`;

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
            trial_period_days: input.trialPeriodDays,
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
        console.error('Stripe subscription session creation failed:', error);
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
        console.error('Stripe portal session creation failed:', error);
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
        console.error('Failed to retrieve payment methods:', error);
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
        console.error('Failed to retrieve subscriptions:', error);
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
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', ctx.user.id);

          if (dbError) {
            console.error('Failed to update database after subscription cancellation:', dbError);
            // Don't throw - webhook will reconcile later
          }
        }

        return subscription;
      } catch (error) {
        console.error('Failed to cancel subscription:', error);
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
        console.log('[updateSubscription] Starting update:', { subscriptionId: input.subscriptionId, newPriceId: input.newPriceId });

        // Get the current subscription
        const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
        console.log('[updateSubscription] Current subscription retrieved');

        // Update the subscription with the new price
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
          }
        );
        console.log('[updateSubscription] Stripe subscription updated successfully');

        // Immediately update the database (optimistic update)
        // Webhook will confirm and reconcile later
        const { tier, monthlyLimit, billing_interval } = getTierFromSubscription(updatedSubscription);
        const nextBillingDate = (updatedSubscription as any).current_period_end
          ? new Date(((updatedSubscription as any).current_period_end || 0) * 1000).toISOString()
          : new Date().toISOString();

        console.log('[updateSubscription] Updating database:', { tier, monthlyLimit, billing_interval, userId: ctx.user.id });

        const { error: dbError } = await ctx.supabase
          .from('subscriptions')
          .update({
            tier,
            monthly_limit: monthlyLimit,
            billing_interval,
            status: updatedSubscription.status as 'active' | 'cancelled' | 'past_due' | 'expired' | 'trialing',
            usage_reset_date: nextBillingDate,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', ctx.user.id);

        if (dbError) {
          console.error('[updateSubscription] Database update error:', dbError);
          // Don't throw - webhook will reconcile later
        } else {
          console.log('[updateSubscription] Database updated successfully');
        }

        return updatedSubscription;
      } catch (error: any) {
        console.error('[updateSubscription] Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update subscription: ${error?.message || 'Unknown error'}`,
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
        console.log('[switchBillingCycle] Starting switch:', { subscriptionId: input.subscriptionId, newPriceId: input.newPriceId });

        // Get the current subscription
        const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
        console.log('[switchBillingCycle] Current subscription retrieved');

        // Update the subscription with the new billing cycle
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
          }
        );
        console.log('[switchBillingCycle] Stripe subscription updated successfully');

        // Update database with new billing interval
        const { tier, monthlyLimit, billing_interval } = getTierFromSubscription(updatedSubscription);
        const nextBillingDate = (updatedSubscription as any).current_period_end
          ? new Date(((updatedSubscription as any).current_period_end || 0) * 1000).toISOString()
          : new Date().toISOString();

        console.log('[switchBillingCycle] Updating database:', { tier, billing_interval, userId: ctx.user.id });

        const { error: dbError } = await ctx.supabase
          .from('subscriptions')
          .update({
            tier,
            monthly_limit: monthlyLimit,
            billing_interval,
            status: updatedSubscription.status as 'active' | 'cancelled' | 'past_due' | 'expired' | 'trialing',
            usage_reset_date: nextBillingDate,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', ctx.user.id);

        if (dbError) {
          console.error('[switchBillingCycle] Database update error:', dbError);
        } else {
          console.log('[switchBillingCycle] Database updated successfully');
        }

        return updatedSubscription;
      } catch (error: any) {
        console.error('[switchBillingCycle] Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to switch billing cycle: ${error?.message || 'Unknown error'}`,
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
      console.error('Failed to retrieve prices:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve prices',
      });
    }
  }),

  /**
   * TEMPORARY: Verify and activate subscription after checkout
   * This is only for local testing when webhooks aren't configured.
   * Remove this in production once Stripe webhooks are properly set up.
   */
  verifyCheckoutSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log('[TEMP] Verifying checkout session:', input.sessionId);

        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
          expand: ['subscription', 'customer'],
        });

        // Verify the session belongs to this user
        if (session.metadata?.userId !== ctx.user.id) {
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
          : (session.subscription as any).id;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        const priceId = subscription.items.data[0]?.price.id;
        let tier: 'free' | 'professional' | 'premium' = 'premium';
        let monthlyLimit = 999999;

        const professionalMonthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID;
        const professionalAnnualPriceId = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID;

        if (priceId === professionalMonthlyPriceId || priceId === professionalAnnualPriceId) {
          tier = 'professional';
          monthlyLimit = 75;
        }

        // Update subscription in database
        const { error } = await ctx.supabase
          .from('subscriptions')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            tier,
            status: 'active',
            monthly_limit: monthlyLimit,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', ctx.user.id);

        if (error) {
          console.error('[TEMP] Error updating subscription:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to activate subscription',
          });
        }

        console.log(`[TEMP] Successfully activated ${tier} subscription for user:`, ctx.user.id);

        return {
          success: true,
          tier,
          status: 'active',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('[TEMP] Failed to verify checkout session:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify checkout session',
        });
      }
    }),
});

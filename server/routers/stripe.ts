import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { stripe } from '../lib/stripe';
import { TRPCError } from '@trpc/server';

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
    .mutation(async ({ input, ctx }) => {
      try {
        // SECURITY: Verify user owns this customer ID
        const { data: subscription } = await ctx.supabase
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', ctx.user.id)
          .single();

        if (!subscription || subscription.stripe_customer_id !== input.customerId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied to this customer',
          });
        }

        const session = await stripe.billingPortal.sessions.create({
          customer: input.customerId,
          return_url: input.returnUrl,
        });

        return {
          url: session.url,
        };
      } catch (error) {
        console.error('Stripe portal session creation failed:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
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
    .query(async ({ input, ctx }) => {
      try {
        // SECURITY: Verify user owns this customer ID
        const { data: subscription } = await ctx.supabase
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', ctx.user.id)
          .single();

        if (!subscription || subscription.stripe_customer_id !== input.customerId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied to this customer',
          });
        }

        const paymentMethods = await stripe.paymentMethods.list({
          customer: input.customerId,
          type: 'card',
        });

        return paymentMethods.data;
      } catch (error) {
        console.error('Failed to retrieve payment methods:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
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
    .query(async ({ input, ctx }) => {
      try {
        // SECURITY: Verify user owns this customer ID
        const { data: subscription } = await ctx.supabase
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', ctx.user.id)
          .single();

        if (!subscription || subscription.stripe_customer_id !== input.customerId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied to this customer',
          });
        }

        const subscriptions = await stripe.subscriptions.list({
          customer: input.customerId,
          status: 'all',
          expand: ['data.default_payment_method'],
        });

        return subscriptions.data;
      } catch (error) {
        console.error('Failed to retrieve subscriptions:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
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
    .mutation(async ({ input, ctx }) => {
      try {
        // SECURITY: Verify user owns this subscription ID
        const { data: subscription } = await ctx.supabase
          .from('subscriptions')
          .select('stripe_subscription_id')
          .eq('user_id', ctx.user.id)
          .single();

        if (!subscription || subscription.stripe_subscription_id !== input.subscriptionId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied to this subscription',
          });
        }

        const updatedSubscription = await stripe.subscriptions.update(
          input.subscriptionId,
          {
            cancel_at_period_end: input.cancelAtPeriodEnd,
          }
        );

        return updatedSubscription;
      } catch (error) {
        console.error('Failed to cancel subscription:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
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
    .mutation(async ({ input, ctx }) => {
      try {
        // SECURITY: Verify user owns this subscription ID
        const { data: subscription } = await ctx.supabase
          .from('subscriptions')
          .select('stripe_subscription_id')
          .eq('user_id', ctx.user.id)
          .single();

        if (!subscription || subscription.stripe_subscription_id !== input.subscriptionId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied to this subscription',
          });
        }

        // Get the current subscription
        const stripeSubscription = await stripe.subscriptions.retrieve(input.subscriptionId);

        // Update the subscription with the new price
        const updatedSubscription = await stripe.subscriptions.update(
          input.subscriptionId,
          {
            items: [
              {
                id: stripeSubscription.items.data[0].id,
                price: input.newPriceId,
              },
            ],
            proration_behavior: 'create_prorations',
          }
        );

        return updatedSubscription;
      } catch (error) {
        console.error('Failed to update subscription:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update subscription',
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

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
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: [
            {
              price: input.priceId,
              quantity: 1,
            },
          ],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          customer_email: ctx.user.email,
          metadata: {
            userId: ctx.user.id,
            ...input.metadata,
          },
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
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [
            {
              price: input.priceId,
              quantity: 1,
            },
          ],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          customer_email: ctx.user.email,
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
    .mutation(async ({ input }) => {
      try {
        const subscription = await stripe.subscriptions.update(
          input.subscriptionId,
          {
            cancel_at_period_end: input.cancelAtPeriodEnd,
          }
        );

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
});

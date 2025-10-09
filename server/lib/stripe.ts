import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

export type StripeCustomerMetadata = {
  userId: string;
  email: string;
};

export type StripeSubscriptionMetadata = {
  userId: string;
  planId: string;
};

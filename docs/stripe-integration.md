# Stripe Integration Guide

This document provides instructions for setting up and using the Stripe payment integration in FreelanceFlow.

## Setup Instructions

### 1. Get Your Stripe Keys

1. Sign up or log in at [https://stripe.com](https://stripe.com)
2. Navigate to Developers → API keys
3. Copy your **Publishable key** (starts with `pk_test_` for test mode)
4. Copy your **Secret key** (starts with `sk_test_` for test mode)

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Set Up Webhook Endpoint

For local development, use the Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will output a webhook signing secret - add this to your `.env.local` as `STRIPE_WEBHOOK_SECRET`.

For production, configure the webhook in the Stripe Dashboard:
- URL: `https://yourdomain.com/api/webhooks/stripe`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### 4. Create Products and Prices

In the Stripe Dashboard:
1. Go to **Products** → **Add product**
2. Enter product name, description, and pricing
3. Create both one-time and recurring prices as needed
4. Copy the Price IDs (start with `price_`) for use in your application

## Usage

### Creating a Checkout Session

```typescript
import { trpc } from '../utils/trpc';

function MyComponent() {
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();

  const handleCheckout = async () => {
    const result = await createCheckout.mutateAsync({
      priceId: 'price_1234567890',
      successUrl: `${window.location.origin}/checkout/success`,
      cancelUrl: `${window.location.origin}/checkout`,
    });

    if (result.url) {
      window.location.href = result.url;
    }
  };

  return <button onClick={handleCheckout}>Buy Now</button>;
}
```

### Creating a Subscription

```typescript
const createSubscription = trpc.stripe.createSubscriptionSession.useMutation();

const handleSubscribe = async () => {
  const result = await createSubscription.mutateAsync({
    priceId: 'price_1234567890',
    successUrl: `${window.location.origin}/checkout/success`,
    cancelUrl: `${window.location.origin}/checkout`,
    trialPeriodDays: 14, // Optional
  });

  if (result.url) {
    window.location.href = result.url;
  }
};
```

### Managing Subscriptions

```typescript
// Get customer subscriptions
const { data: subscriptions } = trpc.stripe.getSubscriptions.useQuery({
  customerId: 'cus_1234567890',
});

// Cancel a subscription
const cancelSubscription = trpc.stripe.cancelSubscription.useMutation();

await cancelSubscription.mutateAsync({
  subscriptionId: 'sub_1234567890',
  cancelAtPeriodEnd: true, // Cancel at end of billing period
});
```

### Customer Portal

```typescript
const createPortal = trpc.stripe.createPortalSession.useMutation();

const handleManageSubscription = async () => {
  const result = await createPortal.mutateAsync({
    customerId: 'cus_1234567890',
    returnUrl: window.location.href,
  });

  if (result.url) {
    window.location.href = result.url;
  }
};
```

## Available tRPC Endpoints

- `stripe.createCheckoutSession` - Create one-time payment checkout
- `stripe.createSubscriptionSession` - Create subscription checkout
- `stripe.createPortalSession` - Customer billing portal access
- `stripe.getPaymentMethods` - List customer payment methods
- `stripe.getSubscriptions` - List customer subscriptions
- `stripe.cancelSubscription` - Cancel a subscription
- `stripe.getPrices` - Get all active prices/plans

## Pages

- `/checkout` - Main checkout page displaying available plans
- `/checkout/success` - Post-payment success page

## Webhook Events Handled

The webhook handler (`/api/webhooks/stripe`) processes:
- `checkout.session.completed` - Payment successful
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_succeeded` - Recurring payment successful
- `invoice.payment_failed` - Payment failed

## Security Best Practices

1. **Never expose secret keys** - Only use `NEXT_PUBLIC_*` for publishable keys
2. **Validate webhook signatures** - Already implemented in webhook handler
3. **Use HTTPS in production** - Required for PCI compliance
4. **Store minimal card data** - Let Stripe handle all sensitive data
5. **Implement idempotency** - Webhook events may be sent multiple times

## Testing

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires 3D Secure: `4000 0025 0000 3155`

Use any future expiry date and any 3-digit CVC.

## Going Live

1. Replace test keys with live keys in production environment
2. Configure production webhook endpoint
3. Test the entire flow in production with real cards
4. Enable Stripe Radar for fraud protection
5. Set up email receipts in Stripe Dashboard

## Troubleshooting

### Webhook not receiving events
- Check webhook endpoint is publicly accessible
- Verify webhook secret is correct
- Check Stripe Dashboard → Webhooks for delivery logs

### Checkout session not creating
- Verify API keys are correct
- Check product/price IDs exist in your Stripe account
- Review server logs for detailed error messages

### Type errors
- Ensure `stripe` package version matches API version in `server/lib/stripe.ts`
- Update API version if needed: [Stripe API Versions](https://stripe.com/docs/api/versioning)

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { trpc } from '../utils/trpc';

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckoutSession = trpc.stripe.createCheckoutSession.useMutation();
  const createSubscriptionSession = trpc.stripe.createSubscriptionSession.useMutation();
  const { data: prices, isLoading: pricesLoading } = trpc.stripe.getPrices.useQuery();

  const handleCheckout = async (priceId: string, isSubscription: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/checkout`;

      let result;
      if (isSubscription) {
        result = await createSubscriptionSession.mutateAsync({
          priceId,
          successUrl,
          cancelUrl,
        });
      } else {
        result = await createCheckoutSession.mutateAsync({
          priceId,
          successUrl,
          cancelUrl,
        });
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to create checkout session. Please try again.');
      setLoading(false);
    }
  };

  if (pricesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pricing options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Select the plan that best fits your needs
          </p>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {prices?.map((price) => {
            const product = price.product as any;
            const isSubscription = price.type === 'recurring';
            const amount = price.unit_amount ? price.unit_amount / 100 : 0;

            return (
              <div
                key={price.id}
                className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200 hover:border-blue-500 transition-colors"
              >
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {product.name || 'Plan'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {product.description || 'No description'}
                  </p>
                  <div className="text-4xl font-bold text-gray-900">
                    ${amount}
                    {isSubscription && (
                      <span className="text-lg font-normal text-gray-600">
                        /{price.recurring?.interval || 'month'}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleCheckout(price.id, isSubscription)}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processing...' : 'Get Started'}
                </button>

                {product.features && (
                  <ul className="mt-8 space-y-4">
                    {product.features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <svg
                          className="h-6 w-6 text-green-500 mr-2 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

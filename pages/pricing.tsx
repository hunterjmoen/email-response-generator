import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { LoginModal } from '../components/auth/LoginModal';
import { UserProfileMenu } from '../components/UserProfileMenu';
import { trpc } from '../utils/trpc';
import { useAuthStore } from '../stores/auth';
import ThemeToggle from '../components/shared/ThemeToggle';

export default function Pricing() {
  const router = useRouter();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  // Prevent hydration mismatch by only rendering auth UI on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Professional Tier Pricing
  const professionalMonthlyPrice = 10;
  const professionalAnnualPrice = Math.round(professionalMonthlyPrice * 12 * 0.8); // 20% discount = $96
  const professionalAnnualMonthlyPrice = Math.round(professionalAnnualPrice / 12);

  // Premium Tier Pricing
  const premiumMonthlyPrice = 19;
  const premiumAnnualPrice = 180; // $180 billed annually
  const premiumAnnualMonthlyPrice = Math.round(premiumAnnualPrice / 12);

  // Replace these with your actual Stripe Price IDs from your Stripe Dashboard
  const PROFESSIONAL_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID || 'price_professional_monthly';
  const PROFESSIONAL_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID || 'price_professional_annual';
  const PREMIUM_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_premium_monthly';
  const PREMIUM_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_ANNUAL_PRICE_ID || 'price_premium_annual';

  const createSubscriptionSession = trpc.stripe.createSubscriptionSession.useMutation();

  // Helper function to check if user has a paid subscription
  const hasSubscription = () => {
    return user?.subscription && user.subscription.tier !== 'free' && user.subscription.status === 'active';
  };

  // Helper function to check if tier is current
  const isCurrentTier = (tier: 'free' | 'professional' | 'premium') => {
    return user?.subscription?.tier === tier &&
           (user.subscription.status === 'active' || user.subscription.status === 'trialing');
  };

  // Helper function to get tier rank for comparison
  const getTierRank = (tier: string): number => {
    const ranks: Record<string, number> = { free: 0, professional: 1, premium: 2 };
    return ranks[tier] ?? 0;
  };

  // Get current user's tier rank
  const currentTierRank = getTierRank(user?.subscription?.tier || 'free');

  // Check if target tier is an upgrade from current
  const isUpgrade = (targetTier: string) => getTierRank(targetTier) > currentTierRank;

  // Check if target tier is a downgrade from current
  const isDowngrade = (targetTier: string) => getTierRank(targetTier) < currentTierRank;

  // Handle new subscription for free users
  const handleSubscribe = async (tier: 'professional' | 'premium') => {
    if (!user) {
      // Store the billing period preference before login
      const checkoutKey = tier === 'professional'
        ? (isAnnual ? 'professional-annual' : 'professional-monthly')
        : (isAnnual ? 'premium-annual' : 'premium-monthly');
      localStorage.setItem('pendingCheckout', checkoutKey);
      setIsLoginModalOpen(true);
      return;
    }

    // Existing paid subscribers should use the billing page
    if (hasSubscription()) {
      router.push('/settings/billing');
      return;
    }

    // Free users can subscribe from here
    const priceId = tier === 'professional'
      ? (isAnnual ? PROFESSIONAL_ANNUAL_PRICE_ID : PROFESSIONAL_MONTHLY_PRICE_ID)
      : (isAnnual ? PREMIUM_ANNUAL_PRICE_ID : PREMIUM_MONTHLY_PRICE_ID);

    setLoading(true);
    try {
      const baseUrl = window.location.origin;
      const result = await createSubscriptionSession.mutateAsync({
        priceId,
        successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/pricing`,
        trialPeriodDays: 14,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(`Failed to start checkout: ${error.message || 'Please try again.'}`);
      setLoading(false);
    }
  };

  // Check for pending checkout after login
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      const pendingCheckout = localStorage.getItem('pendingCheckout');
      if (pendingCheckout) {
        localStorage.removeItem('pendingCheckout');

        // Determine tier and billing from stored checkout
        const isAnnualCheckout = pendingCheckout.includes('annual');
        const tier = pendingCheckout.includes('professional') ? 'professional' : 'premium';

        setIsAnnual(isAnnualCheckout);

        // Use setTimeout to allow state to update
        setTimeout(() => {
          handleSubscribe(tier);
        }, 100);
      }
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      <Toaster position="top-center" />
      <header className="border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 font-bold text-sm">FL</span>
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-white">FreelanceFlow</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Platform</Link>
              <Link href="/#testimonials" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Solutions</Link>
              <Link href="/#resources" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Resources</Link>
              <Link href="/pricing" className="text-gray-900 dark:text-white font-medium">Pricing</Link>
            </nav>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {isMounted && !authLoading && (
                <>
                  {isAuthenticated ? (
                    <UserProfileMenu />
                  ) : (
                    <>
                      <button
                        onClick={() => setIsLoginModalOpen(true)}
                        className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Log in
                      </button>
                      <button
                        onClick={() => setIsLoginModalOpen(true)}
                        className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                      >
                        Get started
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="py-20 bg-gradient-to-br from-green-50 to-white dark:from-gray-800 dark:to-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Start free. Upgrade when you're ready. No hidden fees.
            </p>

            {/* Subscriber Banner - Direct to Billing Page */}
            {hasSubscription() && user?.subscription && (
              <div className="max-w-2xl mx-auto mb-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-green-900 dark:text-green-100">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">
                      You're on the <span className="font-bold capitalize">{user.subscription.tier}</span> plan
                    </span>
                  </div>
                  <Link
                    href="/settings/billing"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                  >
                    Manage Subscription
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}

            <div className="inline-flex items-center bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  !isAnnual
                    ? 'bg-green-600 dark:bg-green-700 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  isAnnual
                    ? 'bg-green-600 dark:bg-green-700 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Annual
                <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Free Tier */}
            <div className={`rounded-2xl border-2 p-8 transition-all ${
              isCurrentTier('free')
                ? 'bg-green-50 dark:bg-green-900/20 border-green-600 dark:border-green-500 ring-2 ring-green-200 dark:ring-green-800'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
              {isCurrentTier('free') && (
                <div className="mb-4">
                  <span className="inline-block bg-green-600 dark:bg-green-700 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    YOUR CURRENT PLAN
                  </span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Free</h3>
                <p className="text-gray-600 dark:text-gray-300">Perfect for getting started</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">$0</span>
                  <span className="text-gray-600 dark:text-gray-400">/month</span>
                </div>
              </div>

              {isCurrentTier('free') ? (
                <button
                  disabled
                  className="w-full bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-6 py-3 rounded-lg font-semibold mb-8 transition-colors cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : hasSubscription() ? (
                <Link
                  href="/settings/billing"
                  className="w-full block text-center bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold mb-8 transition-colors"
                >
                  Downgrade
                </Link>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold mb-8 transition-colors"
                >
                  Start Free
                </button>
              )}

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">10 responses per month</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Try it risk-free</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">AI Response Generation</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Context-aware replies</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Context Selection</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Professional, friendly, or direct</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Copy-Paste Workflow</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Works everywhere</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Tier */}
            <div className={`rounded-2xl border-2 p-8 relative transition-all ${
              isCurrentTier('professional')
                ? 'bg-green-50 dark:bg-green-900/20 border-green-600 dark:border-green-500 ring-2 ring-green-200 dark:ring-green-800'
                : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-600 dark:border-green-500'
            }`}>
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                {isCurrentTier('professional') ? (
                  <span className="bg-green-600 dark:bg-green-700 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    YOUR CURRENT PLAN
                  </span>
                ) : (
                  <span className="bg-green-600 dark:bg-green-700 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    MOST POPULAR
                  </span>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Professional</h3>
                <p className="text-gray-600 dark:text-gray-300">For active freelancers</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">
                    ${isAnnual ? professionalAnnualMonthlyPrice : professionalMonthlyPrice}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">/month</span>
                </div>
                {isAnnual && (
                  <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                    ${professionalAnnualPrice} billed annually
                  </p>
                )}
              </div>

              {isCurrentTier('professional') ? (
                <button
                  disabled
                  className="w-full bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-6 py-3 rounded-lg font-semibold mb-8 transition-colors cursor-not-allowed shadow-md"
                >
                  Current Plan
                </button>
              ) : hasSubscription() && isDowngrade('professional') ? (
                <Link
                  href="/settings/billing"
                  className="w-full block text-center bg-green-600 dark:bg-green-700 text-white px-6 py-3 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 font-semibold mb-8 transition-colors shadow-md"
                >
                  Downgrade
                </Link>
              ) : (
                <button
                  onClick={() => handleSubscribe('professional')}
                  disabled={loading}
                  className="w-full bg-green-600 dark:bg-green-700 text-white px-6 py-3 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 font-semibold mb-8 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' :
                   !user ? 'Sign Up for Professional' :
                   user.subscription?.tier === 'free' && !user.subscription?.has_used_trial ? 'Start Free Trial' :
                   'Subscribe Now'}
                </button>
              )}

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">75 responses per month</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Perfect for regular use</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">All Free features</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">AI generation & context selection</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Full Client Management</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Organize projects & clients</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Unlimited Response History</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Access all past responses</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Priority Support</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Get help when you need it</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Tier */}
            <div className={`rounded-2xl border-2 p-8 transition-all ${
              isCurrentTier('premium')
                ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-900 dark:border-gray-600 ring-2 ring-gray-200 dark:ring-gray-700'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
              {isCurrentTier('premium') && (
                <div className="mb-4">
                  <span className="inline-block bg-gray-900 dark:bg-gray-700 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    YOUR CURRENT PLAN
                  </span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Premium</h3>
                <p className="text-gray-600 dark:text-gray-300">For power users</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">
                    ${isAnnual ? premiumAnnualMonthlyPrice : premiumMonthlyPrice}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">/month</span>
                </div>
                {isAnnual && (
                  <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                    ${premiumAnnualPrice} billed annually
                  </p>
                )}
              </div>

              {isCurrentTier('premium') ? (
                <button
                  disabled
                  className="w-full bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 px-6 py-3 rounded-lg font-semibold mb-8 transition-colors cursor-not-allowed shadow-md"
                >
                  Current Plan
                </button>
              ) : hasSubscription() ? (
                <button
                  onClick={() => handleSubscribe('premium')}
                  disabled={loading}
                  className="w-full bg-gray-900 dark:bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 font-semibold mb-8 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Upgrade'}
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe('premium')}
                  disabled={loading}
                  className="w-full bg-gray-900 dark:bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 font-semibold mb-8 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' :
                   !user ? 'Sign Up for Premium' :
                   user.subscription?.tier === 'free' && !user.subscription?.has_used_trial ? 'Start Free Trial' :
                   'Subscribe Now'}
                </button>
              )}

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Unlimited responses</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">No monthly limits whatsoever</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">All Professional features</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Plus exclusive extras</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">🌟 AI Style Learning</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">AI learns your unique voice</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Advanced Analytics</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Usage insights & trends</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Priority Support</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Fastest response times</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Early Access</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">New features first</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Which plan is right for me?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                <strong>Free</strong> is perfect for trying out the platform. <strong>Professional</strong> ($10/mo) is ideal if you need 2-3 responses per day and want full client management. <strong>Premium</strong> ($19/mo) is best for power users who want unlimited responses plus exclusive AI Style Learning that adapts to your unique voice.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                What happens if I exceed my monthly limit?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                You'll be prompted to upgrade to the next tier. Your account remains active—you can still access your history and client data, but you'll need to upgrade to generate new responses. Free users can upgrade to Professional (75 responses) or Premium (unlimited).
              </p>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Can I switch between plans?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes! You can upgrade or downgrade anytime from your account settings. Upgrades take effect immediately. Downgrades apply at the end of your current billing period. You can move between Free, Professional, and Premium as your needs change.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                How does the annual discount work?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Pay annually and save 20% on both Professional and Premium plans. Professional: ${professionalAnnualPrice}/year (${professionalAnnualMonthlyPrice}/mo) instead of ${professionalMonthlyPrice * 12}/year. Premium: ${premiumAnnualPrice}/year (${premiumAnnualMonthlyPrice}/mo) instead of ${premiumMonthlyPrice * 12}/year.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                What is AI Style Learning?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Exclusive to Premium, AI Style Learning analyzes your communication patterns and adapts future responses to match your unique voice, tone, and phrasing. The AI learns from your feedback and generates responses that sound authentically like you.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Is my data secure?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your data privacy and security are our top priorities. We use enterprise-grade encryption, never share your data with third parties, and comply with GDPR and other privacy regulations.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                We accept all major credit cards (Visa, Mastercard, American Express) and support secure payment processing through industry-standard providers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-green-100 to-green-50 dark:from-gray-900 dark:to-gray-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to Transform Your Client Communication?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Join freelancers who are saving 4+ hours per week with AI-powered responses.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-green-600 dark:bg-green-700 text-white px-8 py-3 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 font-semibold shadow-md transition-colors"
            >
              Start Free Today
            </button>
            <Link
              href="/#features"
              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold flex items-center gap-2 px-8 py-3 transition-colors"
            >
              Learn More
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-gray-300 dark:text-gray-400 py-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div>
              <h4 className="font-semibold text-white dark:text-gray-100 mb-4">PLATFORM</h4>
              <ul className="space-y-2">
                <li><Link href="/dashboard/generate" className="hover:text-white dark:hover:text-gray-200 transition-colors">AI Response Generator</Link></li>
                <li><Link href="/dashboard/generate" className="hover:text-white dark:hover:text-gray-200 transition-colors">Templates</Link></li>
                <li><Link href="/dashboard/index" className="hover:text-white dark:hover:text-gray-200 transition-colors">Response History</Link></li>
                <li><Link href="/pricing" className="hover:text-white dark:hover:text-gray-200 transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white dark:text-gray-100 mb-4">SOLUTIONS</h4>
              <ul className="space-y-2">
                <li><Link href="/#features" className="hover:text-white dark:hover:text-gray-200 transition-colors">By Industry</Link></li>
                <li><Link href="/#features" className="hover:text-white dark:hover:text-gray-200 transition-colors">By Use Case</Link></li>
                <li><Link href="/#features" className="hover:text-white dark:hover:text-gray-200 transition-colors">Platform Agnostic</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white dark:text-gray-100 mb-4">WHY FREELANCEFLOW</h4>
              <ul className="space-y-2">
                <li><Link href="/#testimonials" className="hover:text-white dark:hover:text-gray-200 transition-colors">About Us</Link></li>
                <li><Link href="/#testimonials" className="hover:text-white dark:hover:text-gray-200 transition-colors">Testimonials</Link></li>
                <li><Link href="/#privacy" className="hover:text-white dark:hover:text-gray-200 transition-colors">Privacy & Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white dark:text-gray-100 mb-4">RESOURCES</h4>
              <ul className="space-y-2">
                <li><Link href="/#resources" className="hover:text-white dark:hover:text-gray-200 transition-colors">Newsletter</Link></li>
                <li><Link href="/#resources" className="hover:text-white dark:hover:text-gray-200 transition-colors">Guides</Link></li>
                <li><Link href="/#resources" className="hover:text-white dark:hover:text-gray-200 transition-colors">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white dark:text-gray-100 mb-4">COMPANY</h4>
              <ul className="space-y-2">
                <li><Link href="/#about" className="hover:text-white dark:hover:text-gray-200 transition-colors">Careers</Link></li>
                <li><Link href="/#contact" className="hover:text-white dark:hover:text-gray-200 transition-colors">Contact</Link></li>
                <li><Link href="/#press" className="hover:text-white dark:hover:text-gray-200 transition-colors">Press</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 dark:border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">© 2025 FreelanceFlow. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="w-8 h-8 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                <span className="sr-only">LinkedIn</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a href="#" className="w-8 h-8 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                </svg>
              </a>
              <a href="#" className="w-8 h-8 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                <span className="sr-only">YouTube</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}

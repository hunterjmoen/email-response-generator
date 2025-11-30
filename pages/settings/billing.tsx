import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { SettingsLayout } from '../../components/layouts/SettingsLayout';
import { SettingsSection, SettingsDivider } from '../../components/settings/SettingsSection';
import { CancellationFlow } from '../../components/subscription/CancellationFlow';
import { useAuthStore } from '../../stores/auth';
import { trpc } from '../../utils/trpc';
import toast, { Toaster } from 'react-hot-toast';

// Plan feature definitions
const planFeatures = {
  free: {
    name: 'Free',
    price: 0,
    limit: '10 responses/month',
    features: ['AI Response Generation', 'Context Selection', 'Copy-Paste Workflow'],
  },
  professional: {
    name: 'Professional',
    monthlyPrice: 10,
    annualPrice: 96,
    limit: '75 responses/month',
    features: ['All Free features', 'Full Client Management', 'Unlimited Response History', 'Priority Support'],
  },
  premium: {
    name: 'Premium',
    monthlyPrice: 19,
    annualPrice: 180,
    limit: 'Unlimited responses',
    features: ['All Professional features', 'AI Style Learning', 'Advanced Analytics', 'Early Access to New Features'],
  },
};

export default function BillingSettings() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, refreshSubscription } = useAuthStore();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'professional' | 'premium' | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const createPortalSession = trpc.stripe.createPortalSession.useMutation();
  const createSubscriptionSession = trpc.stripe.createSubscriptionSession.useMutation();
  const updateSubscription = trpc.stripe.updateSubscription.useMutation();
  const cancelSubscription = trpc.stripe.cancelSubscription.useMutation();
  const scheduleDowngrade = trpc.stripe.scheduleDowngrade.useMutation();
  const cancelScheduledDowngrade = trpc.stripe.cancelScheduledDowngrade.useMutation();

  // Price IDs from environment
  const PROFESSIONAL_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID || '';
  const PROFESSIONAL_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID || '';
  const PREMIUM_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID || '';
  const PREMIUM_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_ANNUAL_PRICE_ID || '';

  // Get target price ID for proration preview
  const getTargetPriceId = () => {
    if (!selectedPlan) return '';
    return selectedPlan === 'professional'
      ? (selectedInterval === 'monthly' ? PROFESSIONAL_MONTHLY_PRICE_ID : PROFESSIONAL_ANNUAL_PRICE_ID)
      : (selectedInterval === 'monthly' ? PREMIUM_MONTHLY_PRICE_ID : PREMIUM_ANNUAL_PRICE_ID);
  };

  // Proration preview query - only runs when modal is open and user has active subscription
  const prorationPreview = trpc.stripe.previewProration.useQuery(
    {
      subscriptionId: user?.subscription?.stripe_subscription_id || '',
      newPriceId: getTargetPriceId(),
    },
    {
      enabled: showUpgradeModal &&
               !!user?.subscription?.stripe_subscription_id &&
               !!selectedPlan &&
               user.subscription.tier !== 'free' &&
               !user.subscription.cancel_at_period_end,
      refetchOnWindowFocus: false,
    }
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/settings/billing');
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle URL query params for upgrade intent (e.g., from pricing page)
  useEffect(() => {
    if (!authLoading && isAuthenticated && router.isReady) {
      const { action, tier, interval } = router.query;
      if (action === 'upgrade' && (tier === 'professional' || tier === 'premium')) {
        setSelectedPlan(tier);
        setSelectedInterval(interval === 'annual' ? 'annual' : 'monthly');
        setShowUpgradeModal(true);
        // Clear query params from URL without reload
        router.replace('/settings/billing', undefined, { shallow: true });
      }
    }
  }, [authLoading, isAuthenticated, router.isReady, router.query]);

  // Refresh subscription data when page loads to ensure we have the latest
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      refreshSubscription();
    }
  }, [isAuthenticated, authLoading]);

  const subscription = user?.subscription;
  const currentTier = subscription?.tier || 'free';
  const isFreeTier = currentTier === 'free';
  const isProfessional = currentTier === 'professional';
  const isPremium = currentTier === 'premium';
  const hasActiveSubscription = !isFreeTier && subscription?.status === 'active';
  const isCancelPending = subscription?.cancel_at_period_end;
  const hasScheduledDowngrade = !!subscription?.scheduled_tier;
  const isAnnualSubscription = subscription?.billing_interval === 'annual';

  // Helper to determine if plan change is upgrade or downgrade
  const getTierRank = (tier: string): number => {
    const ranks: Record<string, number> = { free: 0, professional: 1, premium: 2 };
    return ranks[tier] ?? 0;
  };
  const isDowngradeTo = (targetTier: string) => getTierRank(targetTier) < getTierRank(currentTier);

  // Usage calculations
  const usageCount = subscription?.usageCount || 0;
  const monthlyLimit = subscription?.monthlyLimit || 10;
  const usagePercentage = isPremium ? 0 : Math.min((usageCount / monthlyLimit) * 100, 100);

  const getUsageColor = () => {
    if (usagePercentage < 70) return 'bg-green-500';
    if (usagePercentage < 90) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Open Stripe billing portal
  const handleOpenBillingPortal = async () => {
    if (!user?.stripe_customer_id) {
      toast.error('No billing information found');
      return;
    }

    setPortalLoading(true);
    try {
      const result = await createPortalSession.mutateAsync({
        customerId: user.stripe_customer_id,
        returnUrl: `${window.location.origin}/settings/billing`,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      toast.error('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  // Handle plan upgrade or downgrade
  const handleUpgrade = async (tier: 'professional' | 'premium', interval: 'monthly' | 'annual') => {
    setLoading(true);
    try {
      const priceId = tier === 'professional'
        ? (interval === 'monthly' ? PROFESSIONAL_MONTHLY_PRICE_ID : PROFESSIONAL_ANNUAL_PRICE_ID)
        : (interval === 'monthly' ? PREMIUM_MONTHLY_PRICE_ID : PREMIUM_ANNUAL_PRICE_ID);

      const isDowngrade = isDowngradeTo(tier);

      console.log('[Billing] handleUpgrade called:', {
        tier,
        interval,
        hasActiveSubscription,
        stripeSubscriptionId: subscription?.stripe_subscription_id,
        currentStatus: subscription?.status,
        currentTier,
        isFreeTier,
        isCancelPending,
        isDowngrade,
      });

      // For resubscription: if user has a stripe_subscription_id (even if cancel pending), update it
      const canUpdateExisting = subscription?.stripe_subscription_id && subscription?.status === 'active';

      console.log('[Billing] canUpdateExisting:', canUpdateExisting);

      if (canUpdateExisting) {
        // Check if this is a downgrade - schedule for end of period
        if (isDowngrade && !isCancelPending) {
          console.log('[Billing] Scheduling downgrade for end of period...');
          const result = await scheduleDowngrade.mutateAsync({
            subscriptionId: subscription.stripe_subscription_id!,
            newPriceId: priceId,
            newTier: tier,
          });
          await refreshSubscription();
          toast.success(`Your plan will change to ${planFeatures[tier].name} on ${new Date(result.effectiveDate).toLocaleDateString()}`);
          setShowUpgradeModal(false);
          return;
        }

        // Update existing subscription (upgrades or resubscription)
        console.log('[Billing] Updating existing subscription...');
        await updateSubscription.mutateAsync({
          subscriptionId: subscription.stripe_subscription_id!,
          newPriceId: priceId,
        });
        await refreshSubscription();

        // Show appropriate message based on action
        if (isCancelPending && currentTier === tier) {
          toast.success(`Your ${tier} subscription has been reactivated!`);
        } else if (currentTier === tier) {
          toast.success(`Successfully switched to ${interval} billing!`);
        } else {
          toast.success(`Successfully upgraded to ${planFeatures[tier].name}!`);
        }
        setShowUpgradeModal(false);
      } else {
        // Create new subscription (free tier users or users without stripe_subscription_id)
        console.log('[Billing] Creating new checkout session...');
        const result = await createSubscriptionSession.mutateAsync({
          priceId,
          successUrl: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/settings/billing`,
          trialPeriodDays: subscription?.has_used_trial ? undefined : 14,
        });

        if (result.url) {
          window.location.href = result.url;
        }
      }
    } catch (error: any) {
      console.error('Failed to change plan:', error);
      toast.error(error?.message || 'Failed to change plan');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancelling a scheduled downgrade
  const handleCancelScheduledDowngrade = async () => {
    if (!subscription?.stripe_subscription_id) return;

    setLoading(true);
    try {
      await cancelScheduledDowngrade.mutateAsync({
        subscriptionId: subscription.stripe_subscription_id,
      });
      await refreshSubscription();
      toast.success('Scheduled downgrade has been cancelled. Your current plan will continue.');
    } catch (error) {
      console.error('Failed to cancel scheduled downgrade:', error);
      toast.error('Failed to cancel scheduled downgrade');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancellation
  const handleCancelSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return;

    setLoading(true);
    try {
      await cancelSubscription.mutateAsync({
        subscriptionId: subscription.stripe_subscription_id,
        cancelAtPeriodEnd: true,
      });
      await refreshSubscription();
      toast.success('Your subscription has been cancelled. You\'ll retain access until the end of your billing period.');
      setShowCancelModal(false);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  // Open upgrade modal
  const openUpgradeModal = (tier: 'professional' | 'premium') => {
    setSelectedPlan(tier);
    setSelectedInterval(subscription?.billing_interval || 'monthly');
    setShowUpgradeModal(true);
  };

  if (authLoading) {
    return (
      <SettingsLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading billing information...</p>
          </div>
        </div>
      </SettingsLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SettingsLayout>
      <Toaster position="top-center" />

      {/* Current Plan Section */}
      <SettingsSection
        title="Current Plan"
        description="Your subscription and billing details"
      >
        <div className={`rounded-lg border-2 p-6 ${
          isPremium ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' :
          isProfessional ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
          'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {planFeatures[currentTier].name}
                  {subscription?.billing_interval && !isFreeTier && (
                    <span className="text-lg font-normal text-gray-600 dark:text-gray-400 ml-2">
                      ({subscription.billing_interval === 'annual' ? 'Annual' : 'Monthly'})
                    </span>
                  )}
                </h3>
                {isCancelPending ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white">
                    Cancels {subscription?.billingCycle ? new Date(subscription.billingCycle).toLocaleDateString() : 'soon'}
                  </span>
                ) : hasActiveSubscription ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-600 text-white">
                    Active
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {planFeatures[currentTier].limit}
              </p>
              {hasActiveSubscription && subscription?.billingCycle && !isCancelPending && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                  Next billing date: {new Date(subscription.billingCycle).toLocaleDateString()}
                </p>
              )}
            </div>
            {!isFreeTier && (
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  ${subscription?.billing_interval === 'annual'
                    ? (currentTier === 'premium' ? '180' : '96')
                    : (currentTier === 'premium' ? '19' : '10')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  /{subscription?.billing_interval === 'annual' ? 'year' : 'month'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cancellation Pending Warning */}
        {isCancelPending && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Your subscription is scheduled to cancel
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  You'll retain access until {subscription?.billingCycle ? new Date(subscription.billingCycle).toLocaleDateString() : 'the end of your billing period'}.
                  After that, you'll be moved to the Free plan.
                </p>
                <button
                  onClick={() => openUpgradeModal(currentTier as 'professional' | 'premium')}
                  className="mt-3 text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                >
                  Resubscribe to keep your plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scheduled Downgrade Warning */}
        {hasScheduledDowngrade && !isCancelPending && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Plan change scheduled
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Your plan will change to {planFeatures[subscription?.scheduled_tier as keyof typeof planFeatures]?.name || subscription?.scheduled_tier} on{' '}
                  {subscription?.scheduled_tier_change_date
                    ? new Date(subscription.scheduled_tier_change_date).toLocaleDateString()
                    : 'the end of your billing period'}.
                  You'll retain full access to your current {planFeatures[currentTier].name} features until then.
                </p>
                <button
                  onClick={handleCancelScheduledDowngrade}
                  disabled={loading}
                  className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50"
                >
                  {loading ? 'Cancelling...' : 'Cancel scheduled change'}
                </button>
              </div>
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsDivider />

      {/* Usage Section */}
      <SettingsSection
        title="Usage This Month"
        description="Track your response generation usage"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Responses Generated
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {usageCount} / {isPremium ? 'Unlimited' : monthlyLimit}
            </span>
          </div>

          {!isPremium && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${getUsageColor()}`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          )}

          {isPremium ? (
            <p className="text-sm text-green-600 dark:text-green-400">
              You have unlimited responses with your Premium plan.
            </p>
          ) : usagePercentage >= 90 ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              You're running low on responses. Consider upgrading for more.
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Resets on {subscription?.billingCycle ? new Date(subscription.billingCycle).toLocaleDateString() : 'the 1st of next month'}
            </p>
          )}
        </div>
      </SettingsSection>

      <SettingsDivider />

      {/* Change Plan Section */}
      <SettingsSection
        title="Change Plan"
        description="Upgrade or downgrade your subscription"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Free Plan */}
          <div className={`rounded-lg border-2 p-4 ${
            isFreeTier ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'
          }`}>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Free</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">$0</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">10 responses/mo</p>
            {isFreeTier ? (
              <span className="inline-block mt-3 text-sm font-medium text-green-600 dark:text-green-400">
                Current Plan
              </span>
            ) : (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={isCancelPending}
                className="mt-3 w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelPending ? 'Cancellation Pending' : 'Downgrade'}
              </button>
            )}
          </div>

          {/* Professional Plan */}
          <div className={`rounded-lg border-2 p-4 ${
            isProfessional && !isCancelPending ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
            subscription?.scheduled_tier === 'professional' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
            'border-gray-200 dark:border-gray-700'
          }`}>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Professional</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              ${isAnnualSubscription ? '8' : '10'}<span className="text-sm font-normal">/mo</span>
            </p>
            {isAnnualSubscription && (
              <p className="text-xs text-gray-400 dark:text-gray-500">$96 billed annually</p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">75 responses/mo</p>
            {isProfessional && !isCancelPending ? (
              <span className="inline-block mt-3 text-sm font-medium text-green-600 dark:text-green-400">
                Current Plan
              </span>
            ) : subscription?.scheduled_tier === 'professional' ? (
              <span className="inline-block mt-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                Scheduled
              </span>
            ) : (
              <button
                onClick={() => openUpgradeModal('professional')}
                disabled={hasScheduledDowngrade}
                className={`mt-3 w-full px-3 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  isPremium
                    ? 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'text-white bg-green-600 hover:bg-green-700'
                }`}
              >
                {isPremium ? 'Downgrade' : isFreeTier ? 'Upgrade' : 'Resubscribe'}
              </button>
            )}
          </div>

          {/* Premium Plan */}
          <div className={`rounded-lg border-2 p-4 ${
            isPremium && !isCancelPending ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700'
          }`}>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Premium</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              ${isAnnualSubscription ? '15' : '19'}<span className="text-sm font-normal">/mo</span>
            </p>
            {isAnnualSubscription && (
              <p className="text-xs text-gray-400 dark:text-gray-500">$180 billed annually</p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">Unlimited</p>
            {isPremium && !isCancelPending ? (
              <span className="inline-block mt-3 text-sm font-medium text-purple-600 dark:text-purple-400">
                Current Plan
              </span>
            ) : (
              <button
                onClick={() => openUpgradeModal('premium')}
                className="mt-3 w-full px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg"
              >
                {isPremium ? 'Resubscribe' : 'Upgrade'}
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/pricing" className="text-green-600 dark:text-green-400 hover:underline">
            View full plan comparison
          </Link>
        </p>
      </SettingsSection>

      <SettingsDivider />

      {/* Payment Method & Billing History */}
      <SettingsSection
        title="Payment & Billing History"
        description="Manage your payment method and view invoices"
      >
        <div className="space-y-4">
          {hasActiveSubscription || user?.stripe_customer_id ? (
            <button
              onClick={handleOpenBillingPortal}
              disabled={portalLoading}
              className="flex items-center gap-3 w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {portalLoading ? 'Opening...' : 'Manage Payment Method & View Invoices'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Update card, view billing history, download invoices
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No payment method on file. Add one when you upgrade to a paid plan.
            </p>
          )}
        </div>
      </SettingsSection>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {currentTier === selectedPlan && isCancelPending
                ? `Resubscribe to ${planFeatures[selectedPlan].name}`
                : currentTier === selectedPlan && selectedInterval !== subscription?.billing_interval
                ? `Switch to ${selectedInterval === 'annual' ? 'Annual' : 'Monthly'} Billing`
                : isDowngradeTo(selectedPlan)
                ? `Downgrade to ${planFeatures[selectedPlan].name}`
                : `Upgrade to ${planFeatures[selectedPlan].name}`}
            </h3>

            {/* Billing Interval Toggle */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Billing Period
              </label>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => !isAnnualSubscription && setSelectedInterval('monthly')}
                  disabled={isAnnualSubscription}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedInterval === 'monthly'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  } ${isAnnualSubscription ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setSelectedInterval('annual')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedInterval === 'annual'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Annual (Save 20%)
                </button>
              </div>
              {isAnnualSubscription && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Your annual plan is active through {subscription?.billingCycle ? new Date(subscription.billingCycle).toLocaleDateString() : 'your renewal date'}.
                  You can switch to monthly billing when your plan renews.
                </p>
              )}
            </div>

            {/* New Price Display */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-baseline justify-between">
                <span className="text-gray-600 dark:text-gray-400">New plan price</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ${selectedInterval === 'annual'
                      ? planFeatures[selectedPlan].annualPrice
                      : planFeatures[selectedPlan].monthlyPrice}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    /{selectedInterval === 'annual' ? 'year' : 'month'}
                  </span>
                </div>
              </div>
              {selectedInterval === 'annual' && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1 text-right">
                  You save ${((planFeatures[selectedPlan].monthlyPrice || 0) * 12) - (planFeatures[selectedPlan].annualPrice || 0)}/year
                </p>
              )}
            </div>

            {/* Downgrade scheduling notice */}
            {hasActiveSubscription && !isCancelPending && selectedPlan && isDowngradeTo(selectedPlan) && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-amber-900 dark:text-amber-100">
                    Scheduled for end of billing period
                  </span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Your plan will change to {planFeatures[selectedPlan].name} on{' '}
                  {subscription?.billingCycle ? new Date(subscription.billingCycle).toLocaleDateString() : 'your next billing date'}.
                  You'll keep full access to {planFeatures[currentTier].name} features until then.
                </p>
              </div>
            )}

            {/* Proration Preview for existing subscribers (upgrades only) */}
            {hasActiveSubscription && !isCancelPending && selectedPlan && !isDowngradeTo(selectedPlan) && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                {prorationPreview.isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="text-sm text-blue-700 dark:text-blue-300">Calculating billing adjustment...</span>
                  </div>
                ) : prorationPreview.error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Unable to calculate proration. Please try again.
                  </p>
                ) : prorationPreview.data ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-blue-900 dark:text-blue-100">
                        Upgrade Billing Summary
                      </span>
                    </div>

                    <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      {prorationPreview.data.amountDueNow > 0 ? (
                        <>
                          <p>
                            <span className="font-medium">Amount due today:</span>{' '}
                            <span className="font-bold">${prorationPreview.data.amountDueNowFormatted}</span>
                          </p>
                          <p className="text-blue-600 dark:text-blue-400 text-xs">
                            This includes a prorated charge for the remainder of your billing period.
                          </p>
                        </>
                      ) : (
                        <p>No additional charges. Your plan will change at the next billing cycle.</p>
                      )}

                      <p className="text-blue-600 dark:text-blue-400 text-xs pt-1">
                        Next billing date: {new Date(prorationPreview.data.periodEnd).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Features */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Includes:</p>
              <ul className="space-y-2">
                {planFeatures[selectedPlan].features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Trial notice for free users */}
            {isFreeTier && !subscription?.has_used_trial && (
              <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <span className="font-medium">14-day free trial included!</span> You won't be charged until the trial ends.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpgrade(selectedPlan, selectedInterval)}
                disabled={loading || (hasActiveSubscription && !isCancelPending && !isDowngradeTo(selectedPlan) && prorationPreview.isLoading)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Processing...' :
                 hasActiveSubscription && !isCancelPending && isDowngradeTo(selectedPlan)
                   ? 'Schedule Downgrade'
                   : hasActiveSubscription && !isCancelPending && prorationPreview.data && prorationPreview.data.amountDueNow > 0
                   ? `Pay $${prorationPreview.data.amountDueNowFormatted} & Switch`
                   : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Flow Modal */}
      {showCancelModal && !isFreeTier && (
        <CancellationFlow
          currentTier={currentTier as 'professional' | 'premium'}
          billingInterval={subscription?.billing_interval || 'monthly'}
          periodEndDate={subscription?.billingCycle || new Date().toISOString()}
          usageCount={usageCount}
          onCancel={async () => {
            await handleCancelSubscription();
          }}
          onClose={() => setShowCancelModal(false)}
          onDowngrade={currentTier === 'premium' ? () => openUpgradeModal('professional') : undefined}
        />
      )}
    </SettingsLayout>
  );
}

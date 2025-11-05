import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { SettingsLayout } from '../../components/layouts/SettingsLayout';
import { SettingsSection, SettingsDivider } from '../../components/settings/SettingsSection';
import { useAuthStore } from '../../stores/auth';

export default function AccountSettings() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/settings/account');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <SettingsLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading account information...</p>
          </div>
        </div>
      </SettingsLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const subscription = user?.subscription;
  const usagePercentage = subscription
    ? Math.min((subscription.usageCount / subscription.monthlyLimit) * 100, 100)
    : 0;

  const isPremium = subscription?.tier === 'premium';
  const isFree = subscription?.tier === 'free';

  return (
    <SettingsLayout>
      {/* Subscription Section */}
      <SettingsSection
        title="Subscription Plan"
        description="Manage your FreelanceFlow subscription"
      >
        <div className={`rounded-lg border-2 p-6 ${
          isPremium ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-white'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-gray-900 capitalize">
                  {subscription?.tier || 'Free'} Plan
                </h3>
                {isPremium && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-600 text-white">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {isPremium
                  ? 'Unlimited responses, priority support, and advanced features'
                  : `${subscription?.monthlyLimit || 10} responses per month`}
              </p>
            </div>
            {isFree && (
              <Link
                href="/pricing"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors whitespace-nowrap"
              >
                Upgrade to Premium
              </Link>
            )}
          </div>
        </div>

        {/* Billing Info for Premium */}
        {isPremium && subscription?.billingCycle && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Next Billing Date</p>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(subscription.billingCycle).toLocaleDateString()}
                </p>
              </div>
              <Link
                href="/pricing"
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Manage Billing
              </Link>
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsDivider />

      {/* Usage Statistics Section */}
      <SettingsSection
        title="Usage Statistics"
        description="Track your monthly usage"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">
              Responses Generated This Month
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {subscription?.usageCount || 0} / {isPremium ? '∞' : subscription?.monthlyLimit || 10}
            </span>
          </div>

          {!isPremium && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePercentage >= 90
                      ? 'bg-red-600'
                      : usagePercentage >= 70
                      ? 'bg-amber-500'
                      : 'bg-green-600'
                  }`}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>

              <p className="mt-3 text-sm text-gray-600">
                {subscription?.usageCount === subscription?.monthlyLimit ? (
                  <span className="text-red-600 font-medium">
                    You've reached your monthly limit. Upgrade to Premium for unlimited responses.
                  </span>
                ) : usagePercentage >= 70 ? (
                  <span className="text-amber-600 font-medium">
                    You're using {Math.round(usagePercentage)}% of your monthly limit.
                  </span>
                ) : (
                  <span>
                    Usage resets on {subscription?.billingCycle ? new Date(subscription.billingCycle).toLocaleDateString() : 'the 1st of each month'}
                  </span>
                )}
              </p>

              {usagePercentage >= 70 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900 mb-1">
                        Upgrade to Premium
                      </p>
                      <p className="text-sm text-green-700 mb-3">
                        Get unlimited responses and never worry about running out again.
                      </p>
                      <Link
                        href="/pricing"
                        className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-700"
                      >
                        View pricing
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {isPremium && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-green-700">
                You have unlimited responses as a Premium member.
              </p>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsDivider />

      {/* Security Section */}
      <SettingsSection
        title="Security"
        description="Manage your account security settings"
      >
        <div className="space-y-4">
          {/* Change Password */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Password</h4>
              <p className="text-sm text-gray-600 mt-1">
                Last changed: Never
              </p>
            </div>
            <button
              onClick={() => {
                // TODO: Implement password change
                alert('Password change functionality coming soon!');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              Change Password
            </button>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Email Address</h4>
              <p className="text-sm text-gray-600 mt-1">
                {user?.email}
              </p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
              Verified
            </span>
          </div>
        </div>
      </SettingsSection>

      <SettingsDivider />

      {/* Danger Zone */}
      <SettingsSection
        title="Danger Zone"
        description="Irreversible actions"
      >
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">Delete Account</h4>
              <p className="text-sm text-red-700">
                Once you delete your account, there is no going back. This will permanently delete your account and all associated data.
              </p>
            </div>
            <Link
              href="/settings/privacy"
              className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors whitespace-nowrap"
            >
              Delete Account
            </Link>
          </div>
        </div>
      </SettingsSection>
    </SettingsLayout>
  );
}

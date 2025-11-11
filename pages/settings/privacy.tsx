import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { SettingsLayout } from '../../components/layouts/SettingsLayout';
import { SettingsSection, SettingsDivider } from '../../components/settings/SettingsSection';
import { ToggleSwitch } from '../../components/settings/ToggleSwitch';
import { useAuthStore } from '../../stores/auth';
import { trpc } from '../../utils/trpc';

export default function PrivacySettings() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Local state for privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    styleLearningConsent: false,
    analyticsConsent: false,
    marketingConsent: false,
    dataRetentionPeriod: 12,
  });

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = trpc.settings.getProfile.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Update privacy settings mutation
  const updatePrivacy = trpc.settings.updatePrivacySettings.useMutation({
    onSuccess: () => {
      toast.success('Privacy settings updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update privacy settings');
    },
  });

  // Export user data mutation
  const exportData = trpc.settings.exportUserData.useMutation({
    onSuccess: (data) => {
      // Create a downloadable JSON file
      const jsonStr = JSON.stringify(data.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `freelanceflow-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Your data has been exported successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to export data');
    },
  });

  // Populate settings when profile loads
  useEffect(() => {
    if (profile?.privacySettings) {
      setPrivacySettings(profile.privacySettings);
    }
  }, [profile]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/settings/privacy');
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle toggle changes
  const handleToggle = async (key: keyof typeof privacySettings, value: boolean) => {
    const newSettings = { ...privacySettings, [key]: value };
    setPrivacySettings(newSettings);

    setIsSaving(true);
    try {
      await updatePrivacy.mutateAsync(newSettings);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle data retention change
  const handleRetentionChange = async (period: number) => {
    const newSettings = { ...privacySettings, dataRetentionPeriod: period };
    setPrivacySettings(newSettings);

    setIsSaving(true);
    try {
      await updatePrivacy.mutateAsync(newSettings);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle export data
  const handleExportData = async () => {
    await exportData.mutateAsync();
  };

  // Handle delete account
  const handleDeleteAccount = () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    // TODO: Implement account deletion
    toast.error('Account deletion is not yet implemented');
    setShowDeleteModal(false);
    setDeleteConfirmation('');
  };

  if (authLoading || profileLoading) {
    return (
      <SettingsLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading privacy settings...</p>
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
      {/* Privacy Preferences Section */}
      <SettingsSection
        title="Privacy Preferences"
        description="Control how FreelanceFlow uses your data"
      >
        <div className="space-y-6">
          <ToggleSwitch
            enabled={privacySettings.styleLearningConsent}
            onChange={(value) => handleToggle('styleLearningConsent', value)}
            disabled={isSaving}
            label="Style Learning"
            description="Allow FreelanceFlow to analyze your responses to learn your communication style and improve suggestions"
          />

          <ToggleSwitch
            enabled={privacySettings.analyticsConsent}
            onChange={(value) => handleToggle('analyticsConsent', value)}
            disabled={isSaving}
            label="Analytics"
            description="Help us improve FreelanceFlow by sharing anonymous usage data"
          />

          <ToggleSwitch
            enabled={privacySettings.marketingConsent}
            onChange={(value) => handleToggle('marketingConsent', value)}
            disabled={isSaving}
            label="Marketing Communications"
            description="Receive updates about new features, tips, and special offers via email"
          />
        </div>
      </SettingsSection>

      <SettingsDivider />

      {/* Data Retention Section */}
      <SettingsSection
        title="Data Retention"
        description="Choose how long we keep your data"
      >
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Retention Period
          </label>
          <select
            value={privacySettings.dataRetentionPeriod}
            onChange={(e) => handleRetentionChange(Number(e.target.value))}
            disabled={isSaving}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-100"
          >
            <option value={6}>6 months</option>
            <option value={12}>12 months (recommended)</option>
            <option value={24}>24 months</option>
            <option value={36}>36 months</option>
            <option value={-1}>Indefinite</option>
          </select>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Response history and analytics data older than this period will be automatically deleted. Style profiles are kept indefinitely.
          </p>
        </div>
      </SettingsSection>

      <SettingsDivider />

      {/* Data Management Section */}
      <SettingsSection
        title="Data Management"
        description="Export or delete your data"
      >
        <div className="space-y-4">
          {/* Export Data */}
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">Export Your Data</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Download a copy of all your data including profile information, settings, and response history in JSON format.
                </p>
              </div>
              <button
                onClick={handleExportData}
                disabled={exportData.isLoading}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
              >
                {exportData.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Data
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Delete Account */}
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">Delete Your Account</h4>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors whitespace-nowrap"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80" onClick={() => setShowDeleteModal(false)}></div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Delete Account
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        This will permanently delete your account, all response history, settings, and any learned communication styles. This action cannot be undone.
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                          Type <span className="font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm:
                        </label>
                        <input
                          type="text"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                          placeholder="DELETE"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE'}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Account
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation('');
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}

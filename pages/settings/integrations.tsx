import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { SettingsLayout } from '../../components/layouts/SettingsLayout';
import { SettingsSection, SettingsDivider } from '../../components/settings/SettingsSection';
import { useAuthStore } from '../../stores/auth';
import { CheckIcon } from '@heroicons/react/24/outline';

const CHROME_EXTENSION_URL = 'https://chrome.google.com/webstore/detail/freelanceflow';

const extensionFeatures = [
  'Generate responses without leaving Gmail',
  'Detect scope creep in client emails',
  'Access your client context instantly',
  'Create change orders with one click',
];

export default function IntegrationsSettings() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/settings/integrations');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <SettingsLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
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
      {/* Browser Extension Section */}
      <SettingsSection
        title="Browser Extension"
        description="Extend FreelanceFlow's capabilities with our browser extension"
      >
        {/* Chrome Extension Card */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              {/* Chrome Logo */}
              <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-xl shadow-sm flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#4285F4"/>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10" fill="#34A853"/>
                  <path d="M12 2c5.52 0 10 4.48 10 10" fill="#EA4335"/>
                  <path d="M2 12c0 5.52 4.48 10 10 10" fill="#FBBC05"/>
                  <circle cx="12" cy="12" r="4" fill="white"/>
                  <circle cx="12" cy="12" r="3.2" fill="#4285F4"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  FreelanceFlow for Chrome
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gmail integration
                </p>
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6">
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Access FreelanceFlow's AI-powered responses directly from Gmail.
              No more copy-pasting—generate professional replies, detect scope creep,
              and manage clients without leaving your inbox.
            </p>

            {/* Features List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {extensionFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-5 h-5 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mt-0.5">
                    <CheckIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>

            {/* Install Button */}
            <a
              href={CHROME_EXTENSION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-3.953 6.848c.062.002.124.005.187.005 6.627 0 12-5.373 12-12 0-1.054-.139-2.077-.389-3.053zM12 8.727a3.273 3.273 0 1 0 0 6.546 3.273 3.273 0 0 0 0-6.546z"/>
              </svg>
              Add to Chrome — It's Free
            </a>
          </div>
        </div>
      </SettingsSection>

      <SettingsDivider />

      {/* Coming Soon Section */}
      <SettingsSection
        title="Coming Soon"
        description="More integrations are on the way"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Slack Card */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 opacity-60">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01E5A"/>
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Slack</h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">Coming soon</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generate responses to client messages in Slack
            </p>
          </div>

          {/* Notion Card */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 opacity-60">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.166V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.449.327s0 .84-1.168.84l-3.22.186c-.094-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933l3.222-.187zM2.877.466l13.542-.933c1.635-.14 2.055.093 2.755.606l3.783 2.66c.513.373.653.466.653 1.026V20.34c0 1.026-.373 1.633-1.682 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747L1.195 18.94c-.56-.747-.793-1.306-.793-1.959V2.012C.402 1.059.775.513 2.877.466z" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Notion</h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">Coming soon</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sync client notes and project details
            </p>
          </div>
        </div>
      </SettingsSection>
    </SettingsLayout>
  );
}

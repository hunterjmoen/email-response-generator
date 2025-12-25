import { useState, useEffect } from 'react';
import { PuzzlePieceIcon, XMarkIcon } from '@heroicons/react/24/outline';

const CHROME_EXTENSION_URL = 'https://chrome.google.com/webstore/detail/freelanceflow';
const STORAGE_KEY = 'extension-banner-dismissed';

export function ExtensionBanner() {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to prevent flash
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setIsDismissed(false);
      // Small delay for smooth entrance animation
      setTimeout(() => setIsVisible(true), 100);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Wait for animation before hiding
    setTimeout(() => {
      setIsDismissed(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, 300);
  };

  if (isDismissed) return null;

  return (
    <div
      className={`mx-6 mt-4 transition-all duration-300 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/50 rounded-lg px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-800/50 rounded-lg flex items-center justify-center">
            <PuzzlePieceIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              Get the Chrome Extension
            </p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 hidden sm:block">
              Use FreelanceFlow directly in Gmail without switching tabs
            </p>
          </div>

          {/* CTA Button */}
          <a
            href={CHROME_EXTENSION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-3.953 6.848c.062.002.124.005.187.005 6.627 0 12-5.373 12-12 0-1.054-.139-2.077-.389-3.053zM12 8.727a3.273 3.273 0 1 0 0 6.546 3.273 3.273 0 0 0 0-6.546z"/>
            </svg>
            <span className="hidden sm:inline">Add to Chrome</span>
            <span className="sm:hidden">Install</span>
          </a>

          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1.5 text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

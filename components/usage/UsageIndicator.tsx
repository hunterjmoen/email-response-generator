import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';

interface UsageIndicatorProps {
  usageCount: number;
  monthlyLimit: number;
  tier: 'free' | 'professional' | 'premium';
  compact?: boolean;
}

export function UsageIndicator({
  usageCount,
  monthlyLimit,
  tier,
  compact = false
}: UsageIndicatorProps) {
  const [isPulsing, setIsPulsing] = useState(false);

  const isUnlimited = tier === 'premium' || monthlyLimit >= 999999;
  const percentage = isUnlimited ? 0 : Math.min((usageCount / monthlyLimit) * 100, 100);
  const remaining = isUnlimited ? Infinity : Math.max(monthlyLimit - usageCount, 0);

  // Calculate days until reset (assumes monthly reset)
  const daysUntilReset = useMemo(() => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const diff = nextMonth.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, []);

  // Warning thresholds
  const isWarning = percentage >= 70 && percentage < 90;
  const isCritical = percentage >= 90;
  const isExceeded = usageCount >= monthlyLimit && !isUnlimited;

  const statusColor = useMemo(() => {
    if (isUnlimited) return 'text-green-600';
    if (isExceeded) return 'text-red-600';
    if (isCritical) return 'text-orange-600';
    if (isWarning) return 'text-yellow-600';
    return 'text-gray-600';
  }, [isUnlimited, isExceeded, isCritical, isWarning]);

  const progressBarColor = useMemo(() => {
    if (isExceeded) return 'bg-red-500';
    if (isCritical) return 'bg-orange-500';
    if (isWarning) return 'bg-yellow-500';
    return 'bg-green-500';
  }, [isExceeded, isCritical, isWarning]);

  // Pulse animation when critical or exceeded
  useEffect(() => {
    if (isCritical || isExceeded) {
      setIsPulsing(true);
    } else {
      setIsPulsing(false);
    }
  }, [isCritical, isExceeded]);

  if (compact) {
    return (
      <div className="text-xs">
        {isUnlimited ? (
          <div className="flex items-center gap-1 text-green-600">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Unlimited</span>
          </div>
        ) : (
          <div className={statusColor}>
            {usageCount}/{monthlyLimit} used
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${
      isExceeded ? 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30 border-red-300 dark:border-red-800' :
      isCritical ? 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30 border-orange-300 dark:border-orange-800' :
      isWarning ? 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/30 border-yellow-300 dark:border-yellow-800' :
      'from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700'
    } border-2 rounded-xl p-4 transition-all duration-300 ${isPulsing ? 'animate-pulse' : ''}`}>

      {/* Premium Badge */}
      {isUnlimited && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold rounded-full mb-3">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          PREMIUM
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Monthly Usage
          </h3>
          {isUnlimited ? (
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ∞
              </p>
              <span className="text-sm text-gray-600 dark:text-gray-400">Unlimited</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <p className={`text-2xl font-bold ${statusColor} dark:${statusColor.replace('600', '400')}`}>
                {usageCount}
              </p>
              <span className="text-sm text-gray-500 dark:text-gray-400">/ {monthlyLimit}</span>
            </div>
          )}
        </div>
        {!isUnlimited && (
          <div className="text-right">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Left
            </p>
            <p className={`text-2xl font-bold ${statusColor} dark:${statusColor.replace('600', '400')}`}>
              {remaining}
            </p>
          </div>
        )}
      </div>

      {!isUnlimited && (
        <>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${progressBarColor}`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Warning messages */}
          {isExceeded && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-2">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-medium text-red-800 dark:text-red-300">
                    Monthly limit reached
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                    {tier === 'free' ? 'Upgrade to Professional or Premium for more responses' : 'Upgrade to Premium for unlimited responses'}
                  </p>
                </div>
              </div>
              <Link
                href="/pricing"
                className="mt-2 block w-full text-center bg-red-600 text-white text-xs font-medium py-2 px-3 rounded-md hover:bg-red-700 transition-colors"
              >
                Upgrade Now
              </Link>
            </div>
          )}

          {isCritical && !isExceeded && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3 mb-2">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-medium text-orange-800 dark:text-orange-300">
                    Running low on responses
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                    Only {remaining} {remaining === 1 ? 'response' : 'responses'} remaining this month
                  </p>
                </div>
              </div>
              <Link
                href="/pricing"
                className="mt-2 block w-full text-center bg-orange-600 text-white text-xs font-medium py-2 px-3 rounded-md hover:bg-orange-700 transition-colors"
              >
                View Premium Plans
              </Link>
            </div>
          )}

          {isWarning && !isCritical && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-2">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                    {remaining} {remaining === 1 ? 'response' : 'responses'} left this month
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isWarning && !isCritical && !isExceeded && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                <span>Resets in {daysUntilReset} {daysUntilReset === 1 ? 'day' : 'days'}</span>
                <span>{tier === 'free' ? 'Free Plan' : tier === 'professional' ? 'Pro Plan' : ''}</span>
              </p>
              {tier === 'free' && percentage >= 50 && (
                <Link
                  href="/pricing"
                  className="block w-full text-center bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs font-semibold py-2.5 px-3 rounded-lg transition-all shadow-sm hover:shadow-md"
                >
                  ⚡ Upgrade to Pro - 75 responses/mo
                </Link>
              )}
              {tier === 'professional' && percentage >= 50 && (
                <Link
                  href="/pricing"
                  className="block w-full text-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold py-2.5 px-3 rounded-lg transition-all shadow-sm hover:shadow-md"
                >
                  ✨ Go Premium - Unlimited
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

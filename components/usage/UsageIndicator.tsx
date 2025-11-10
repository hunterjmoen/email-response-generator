import { useMemo } from 'react';
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
  const isUnlimited = tier === 'premium' || monthlyLimit >= 999999;
  const percentage = isUnlimited ? 0 : Math.min((usageCount / monthlyLimit) * 100, 100);
  const remaining = isUnlimited ? Infinity : Math.max(monthlyLimit - usageCount, 0);

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

  if (compact) {
    return (
      <div className="text-xs">
        {isUnlimited ? (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Unlimited</span>
          </div>
        ) : (
          <div className={`${statusColor} dark:${statusColor.replace('text-gray-600', 'text-gray-400')}`}>
            {usageCount}/{monthlyLimit} used
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {isUnlimited ? 'Usage' : 'Monthly Usage'}
          </h3>
          {isUnlimited ? (
            <p className="text-xl font-semibold text-green-600 dark:text-green-400 mt-1">
              Unlimited
            </p>
          ) : (
            <p className={`text-xl font-semibold mt-1 ${statusColor} dark:${statusColor.replace('gray', 'gray')}`}>
              {usageCount} / {monthlyLimit}
            </p>
          )}
        </div>
        {!isUnlimited && (
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
            <p className={`text-lg font-semibold ${statusColor} dark:${statusColor.replace('gray', 'gray')}`}>
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
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Resets monthly • <Link href="/pricing" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium">Upgrade for unlimited</Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}

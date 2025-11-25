import { useState } from 'react';

// Cancellation reasons
const CANCELLATION_REASONS = [
  { id: 'too_expensive', label: 'Too expensive', icon: '💰' },
  { id: 'not_using', label: 'Not using it enough', icon: '📉' },
  { id: 'missing_features', label: 'Missing features I need', icon: '🔧' },
  { id: 'switching', label: 'Switching to another tool', icon: '🔄' },
  { id: 'temporary', label: 'Just a temporary project', icon: '⏱️' },
  { id: 'other', label: 'Other reason', icon: '💭' },
] as const;

type CancellationReason = typeof CANCELLATION_REASONS[number]['id'];

interface CancellationFlowProps {
  currentTier: 'professional' | 'premium';
  billingInterval: 'monthly' | 'annual';
  periodEndDate: string;
  usageCount: number;
  onCancel: () => Promise<void>;
  onClose: () => void;
  onDowngrade?: () => void;
}

export function CancellationFlow({
  currentTier,
  billingInterval,
  periodEndDate,
  usageCount,
  onCancel,
  onClose,
  onDowngrade,
}: CancellationFlowProps) {
  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState<CancellationReason | null>(null);
  const [otherReason, setOtherReason] = useState('');
  const [loading, setLoading] = useState(false);

  const totalSteps = 4;

  // Features they'll lose based on tier
  const featuresLost = currentTier === 'premium'
    ? [
        'Unlimited response generation',
        'AI Style Learning',
        'Advanced Analytics',
        'Early Access to New Features',
        'Priority Support',
      ]
    : [
        '75 responses per month',
        'Full Client Management',
        'Unlimited Response History',
        'Priority Support',
      ];

  // Get retention offer based on reason
  const getRetentionOffer = () => {
    switch (selectedReason) {
      case 'too_expensive':
        return {
          title: 'We understand budgets can be tight',
          description: currentTier === 'premium'
            ? 'Would you like to downgrade to Professional instead? You\'ll still get 75 responses/month and client management.'
            : 'Would you like to switch to annual billing? You\'ll save 20% on your subscription.',
          action: currentTier === 'premium' ? 'downgrade' : 'annual',
          buttonText: currentTier === 'premium' ? 'Switch to Professional ($10/mo)' : 'Switch to Annual (Save 20%)',
        };
      case 'not_using':
        return {
          title: 'Take a break instead?',
          description: 'You can keep your account and come back anytime. Your settings and history will be preserved on the free plan.',
          action: 'none',
          buttonText: null,
        };
      case 'missing_features':
        return {
          title: 'Help us improve!',
          description: 'We\'d love to hear what features you need. Your feedback directly shapes our roadmap.',
          action: 'feedback',
          buttonText: 'Share Feature Request',
        };
      case 'switching':
        return {
          title: 'Can we ask why?',
          description: 'Understanding what other tools offer helps us improve. Is there something specific the other tool does better?',
          action: 'none',
          buttonText: null,
        };
      case 'temporary':
        return {
          title: 'Project complete?',
          description: 'Congratulations on finishing your project! You can always come back when you need us again.',
          action: 'none',
          buttonText: null,
        };
      default:
        return {
          title: 'Before you go...',
          description: 'We\'re always looking to improve. Is there anything we could have done better?',
          action: 'none',
          buttonText: null,
        };
    }
  };

  const handleConfirmCancel = async () => {
    setLoading(true);
    try {
      await onCancel();
    } finally {
      setLoading(false);
    }
  };

  const handleRetentionAction = () => {
    const offer = getRetentionOffer();
    if (offer.action === 'downgrade' && onDowngrade) {
      onDowngrade();
      onClose();
    } else if (offer.action === 'feedback') {
      window.open('mailto:support@freelanceflow.com?subject=Feature Request', '_blank');
    }
  };

  const renderStep = () => {
    switch (step) {
      // Step 1: Exit Survey
      case 1:
        return (
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              We're sorry to see you go
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Before you cancel, please let us know why you're leaving. Your feedback helps us improve.
            </p>

            <div className="space-y-2">
              {CANCELLATION_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                    selectedReason === reason.id
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-xl">{reason.icon}</span>
                  <span className={`font-medium ${
                    selectedReason === reason.id
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {reason.label}
                  </span>
                  {selectedReason === reason.id && (
                    <svg className="w-5 h-5 text-red-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {selectedReason === 'other' && (
              <textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Please tell us more..."
                className="mt-4 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={3}
              />
            )}
          </div>
        );

      // Step 2: Retention Offer
      case 2:
        const offer = getRetentionOffer();
        return (
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {offer.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {offer.description}
              </p>
            </div>

            {offer.buttonText && (
              <button
                onClick={handleRetentionAction}
                className="w-full mb-4 px-4 py-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                {offer.buttonText}
              </button>
            )}

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Or continue with cancellation below
            </p>
          </div>
        );

      // Step 3: Value Reinforcement
      case 3:
        return (
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Here's what you'll lose
              </h3>
            </div>

            {/* Usage Stats */}
            {usageCount > 0 && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      You've generated {usageCount} responses
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Your history will still be accessible on the free plan
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Features Lost */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Features you'll lose access to:
              </p>
              {featuresLost.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                >
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-red-700 dark:text-red-300">{feature}</span>
                </div>
              ))}
            </div>

            {/* Downgrade on Free Plan */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">On the free plan:</span>{' '}
                You'll have 10 responses/month and basic features. Your account data will be preserved.
              </p>
            </div>
          </div>
        );

      // Step 4: Final Confirmation
      case 4:
        return (
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Confirm Cancellation
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Are you absolutely sure you want to cancel your {currentTier} subscription?
              </p>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    You'll retain access until {new Date(periodEndDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    After this date, you'll be automatically moved to the free plan.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
              You can resubscribe anytime from the billing page.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Step {step} of {totalSteps}
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-red-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Back
              </button>
            ) : (
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Never mind
              </button>
            )}

            {step < totalSteps ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !selectedReason}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleConfirmCancel}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Cancelling...' : 'Yes, Cancel Subscription'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

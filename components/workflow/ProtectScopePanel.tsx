import { useState, useCallback } from 'react';
import { ChangeOrderBuilder } from './ChangeOrderBuilder';
import { MessageInputForm, type ScopeCreepData } from './MessageInputForm';
import type { ValidatedMessageInput } from '@freelance-flow/shared';
import { trpc } from '../../utils/trpc';

interface ProtectScopePanelProps {
  onScopeCreepDetected?: (data: ScopeCreepData | null) => void;
  onResponseGenerated?: (response: string) => void;
  defaultHourlyRate?: number;
  clientId?: string;
}

type PanelState = 'input' | 'builder' | 'response';

interface ChangeOrderSummary {
  subtotal: number;
  additionalDays: number;
  lineItemCount: number;
}

export function ProtectScopePanel({
  onScopeCreepDetected,
  onResponseGenerated,
  defaultHourlyRate = 100,
  clientId,
}: ProtectScopePanelProps) {
  const [panelState, setPanelState] = useState<PanelState>('input');
  const [scopeCreepData, setScopeCreepData] = useState<ScopeCreepData | null>(null);
  const [originalMessage, setOriginalMessage] = useState('');
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [changeOrderSummary, setChangeOrderSummary] = useState<ChangeOrderSummary | null>(null);
  const [pricingConfirmed, setPricingConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateBoundaryMutation = trpc.responses.generateBoundaryResponse.useMutation();

  const handleScopeCreepDetected = useCallback(
    (data: ScopeCreepData | null) => {
      setScopeCreepData(data);
      onScopeCreepDetected?.(data);
    },
    [onScopeCreepDetected]
  );

  const handleFormSubmit = useCallback((input: ValidatedMessageInput) => {
    setOriginalMessage(input.originalMessage);
    // If scope creep was detected, go to builder
    // Otherwise, could go to regular response generation
    setPanelState('builder');
  }, []);

  const handleCreateChangeOrder = useCallback(() => {
    setPanelState('builder');
  }, []);

  const handleCancelBuilder = useCallback(() => {
    setPanelState('input');
  }, []);

  const handleGenerateResponse = useCallback(
    async (data: {
      title: string;
      description: string;
      lineItems: { description: string; hours: number; rate: number }[];
      additionalTimelineDays: number;
      subtotal: number;
    }) => {
      setGenerateError(null);
      setPricingConfirmed(false);
      setCopied(false);

      try {
        const result = await generateBoundaryMutation.mutateAsync({
          originalMessage,
          changeOrderData: {
            title: data.title,
            description: data.description,
            lineItems: data.lineItems,
            additionalTimelineDays: data.additionalTimelineDays,
            subtotal: data.subtotal,
          },
          clientId,
        });

        setGeneratedResponse(result.response);
        setChangeOrderSummary({
          subtotal: data.subtotal,
          additionalDays: data.additionalTimelineDays,
          lineItemCount: data.lineItems.length,
        });
        setPanelState('response');
        onResponseGenerated?.(result.response);
      } catch (error: any) {
        console.error('Failed to generate response:', error);
        setGenerateError(error.message || 'Failed to generate response');
      }
    },
    [originalMessage, clientId, generateBoundaryMutation, onResponseGenerated]
  );

  const handleCopyResponse = useCallback(() => {
    navigator.clipboard.writeText(generatedResponse);
    setCopied(true);
  }, [generatedResponse]);

  const handleConfirmPricing = useCallback(() => {
    setPricingConfirmed(true);
  }, []);

  const handleStartNew = useCallback(() => {
    setPanelState('input');
    setScopeCreepData(null);
    setOriginalMessage('');
    setGeneratedResponse('');
    setChangeOrderSummary(null);
    setPricingConfirmed(false);
    setCopied(false);
  }, []);

  // Input state - show message form with scope detection
  if (panelState === 'input') {
    return (
      <div className="space-y-4">
        {/* Info Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Protect Your Scope
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Paste a client message below. If scope creep is detected, you can create a
                professional change order response in one click.
              </p>
            </div>
          </div>
        </div>

        {/* Message Input Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <MessageInputForm
            onSubmit={handleFormSubmit}
            isLoading={false}
            onScopeCreepDetected={handleScopeCreepDetected}
            defaultValues={{
              originalMessage: '',
              context: {
                urgency: 'standard',
                messageType: 'scope_change',
                relationshipStage: 'established',
                projectPhase: 'active',
              },
            }}
          />
        </div>

        {/* CTA when scope creep is detected but form not submitted yet */}
        {scopeCreepData?.detected && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-amber-300 dark:border-amber-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-amber-600 dark:text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Scope creep detected!
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ready to create a change order?
                  </p>
                </div>
              </div>
              <button
                onClick={handleCreateChangeOrder}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
              >
                Create Change Order
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Builder state - show change order builder
  if (panelState === 'builder') {
    return (
      <div className="space-y-4">
        {generateError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{generateError}</p>
          </div>
        )}
        <ChangeOrderBuilder
          originalMessage={originalMessage}
          detectedPhrases={scopeCreepData?.phrases}
          defaultRate={defaultHourlyRate}
          onGenerate={handleGenerateResponse}
          onCancel={handleCancelBuilder}
          isLoading={generateBoundaryMutation.isPending}
        />
      </div>
    );
  }

  // Response state - show generated response
  return (
    <div className="space-y-4">
      {/* Pricing Warning Banner - Always visible */}
      {changeOrderSummary && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Review Before Sending
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                This response includes pricing. Please verify the numbers are correct:
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 font-medium">
                  ${changeOrderSummary.subtotal.toFixed(2)}
                </span>
                {changeOrderSummary.additionalDays > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 font-medium">
                    +{changeOrderSummary.additionalDays} day{changeOrderSummary.additionalDays !== 1 ? 's' : ''}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {changeOrderSummary.lineItemCount} line item{changeOrderSummary.lineItemCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600 dark:text-green-400"
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
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Response Generated
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {pricingConfirmed ? 'Ready to copy' : 'Confirm pricing to copy'}
                </p>
              </div>
            </div>
            <button
              onClick={handleStartNew}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Start new
            </button>
          </div>
        </div>

        {/* Response Content */}
        <div className="p-6">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4">
            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {generatedResponse}
            </p>
          </div>

          {/* Confirm + Copy Flow */}
          {!pricingConfirmed ? (
            <button
              onClick={handleConfirmPricing}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              I've Verified the Pricing - Lock It
            </button>
          ) : (
            <button
              onClick={handleCopyResponse}
              className={`w-full py-3 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                copied
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-2 border-green-300 dark:border-green-700'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Copied to Clipboard
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy Response
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

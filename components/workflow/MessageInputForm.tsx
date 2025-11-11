import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MessageInputSchema, type ValidatedMessageInput, MESSAGE_VALIDATION } from '@freelance-flow/shared';
import { ContextSelector } from './ContextSelector';

interface MessageInputFormProps {
  onSubmit: (data: ValidatedMessageInput) => void;
  isLoading?: boolean;
  defaultValues?: Partial<ValidatedMessageInput>;
}

export function MessageInputForm({ onSubmit, isLoading = false, defaultValues }: MessageInputFormProps) {
  const [charCount, setCharCount] = useState(defaultValues?.originalMessage?.length || 0);

  const methods = useForm<ValidatedMessageInput>({
    resolver: zodResolver(MessageInputSchema),
    defaultValues: {
      originalMessage: '',
      context: {
        urgency: 'standard',
        messageType: 'update',
        relationshipStage: 'established',
        projectPhase: 'active',
      },
      ...defaultValues,
    },
    mode: 'all', // Validate on change, blur, and submit
    shouldUnregister: false, // Keep field values when fields are unmounted (collapsed)
    reValidateMode: 'onChange', // Re-validate on every change
  });

  const { register, handleSubmit, formState: { errors, isValid }, watch, trigger, setValue } = methods;

  // Watch the message field to update character count
  const messageValue = watch('originalMessage');

  // Trigger validation on mount to ensure all fields (including hidden context fields) are validated
  useEffect(() => {
    // Trigger validation after a brief delay to ensure fields are registered
    const timeoutId = setTimeout(() => {
      trigger();
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [trigger]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCharCount(e.target.value.length);
  };

  const getCharCountColor = () => {
    if (charCount < MESSAGE_VALIDATION.minLength) return 'text-red-500';
    if (charCount > MESSAGE_VALIDATION.maxLength * 0.9) return 'text-yellow-500';
    if (charCount > MESSAGE_VALIDATION.maxLength) return 'text-red-500';
    return 'text-gray-500 dark:text-gray-400';
  };

  return (
    <FormProvider {...methods}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="originalMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Client Message
          </label>
          <div className="relative">
            <textarea
              {...register('originalMessage', {
                onChange: handleMessageChange
              })}
              id="originalMessage"
              rows={6}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical dark:bg-gray-900 dark:text-gray-100 ${
                errors.originalMessage ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Paste your client's message here..."
              disabled={isLoading}
            />
            <div className={`absolute bottom-2 right-2 text-xs ${getCharCountColor()}`}>
              {charCount}/{MESSAGE_VALIDATION.maxLength}
            </div>
          </div>
          {errors.originalMessage && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.originalMessage.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Minimum {MESSAGE_VALIDATION.minLength} characters required for quality response generation
          </p>
        </div>

          <ContextSelector />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !isValid}
              className={`px-6 py-2 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isLoading || !isValid
                  ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {isLoading ? 'Generating...' : 'Generate Responses'}
            </button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}
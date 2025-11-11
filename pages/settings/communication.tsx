import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { SettingsLayout } from '../../components/layouts/SettingsLayout';
import { SettingsSection, SettingsField, SettingsDivider } from '../../components/settings/SettingsSection';
import { useAuthStore } from '../../stores/auth';
import { trpc } from '../../utils/trpc';
import { supabase } from '../../utils/supabase';

// Form validation schemas
const CommunicationStyleSchema = z.object({
  formality: z.enum(['casual', 'professional', 'formal']),
  tone: z.enum(['friendly', 'neutral', 'firm']),
  length: z.enum(['concise', 'standard', 'detailed']),
});

const DefaultContextSchema = z.object({
  relationshipStage: z.enum(['new', 'established', 'long-term']),
  projectPhase: z.enum(['discovery', 'active', 'completion', 'maintenance']),
  urgency: z.enum(['low', 'standard', 'high', 'urgent']),
  messageType: z.enum(['update', 'question', 'request', 'issue', 'general']),
});

type CommunicationStyleData = z.infer<typeof CommunicationStyleSchema>;
type DefaultContextData = z.infer<typeof DefaultContextSchema>;

export default function CommunicationSettings() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();
  const [isSavingStyle, setIsSavingStyle] = useState(false);
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [learnedStyle, setLearnedStyle] = useState<any>(null);

  // Fetch user profile
  const { data: profile, isLoading: profileLoading, refetch } = trpc.settings.getProfile.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Update communication style mutation
  const updateStyle = trpc.settings.updateCommunicationStyle.useMutation({
    onSuccess: async () => {
      toast.success('Communication style updated successfully!');
      await refetch();
      await initialize();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update communication style');
    },
  });

  // Update default context mutation
  const updateContext = trpc.settings.updateDefaultContext.useMutation({
    onSuccess: async () => {
      toast.success('Default context updated successfully!');
      await refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update default context');
    },
  });

  // Communication Style Form
  const styleForm = useForm<CommunicationStyleData>({
    resolver: zodResolver(CommunicationStyleSchema),
    defaultValues: {
      formality: 'professional',
      tone: 'neutral',
      length: 'standard',
    },
  });

  // Default Context Form
  const contextForm = useForm<DefaultContextData>({
    resolver: zodResolver(DefaultContextSchema),
    defaultValues: {
      relationshipStage: 'established',
      projectPhase: 'active',
      urgency: 'standard',
      messageType: 'update',
    },
  });

  // Populate forms when profile loads
  useEffect(() => {
    if (profile?.communicationStyle) {
      styleForm.reset(profile.communicationStyle);
    }
    if (profile?.preferences?.defaultContext) {
      contextForm.reset(profile.preferences.defaultContext);
    }
  }, [profile, styleForm, contextForm]);

  // Fetch learned style from user
  useEffect(() => {
    if (user) {
      setLearnedStyle((user as any)?.style_profile);
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/settings/communication');
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle style form submission
  const onSubmitStyle = async (data: CommunicationStyleData) => {
    setIsSavingStyle(true);
    try {
      await updateStyle.mutateAsync(data);
    } finally {
      setIsSavingStyle(false);
    }
  };

  // Handle context form submission
  const onSubmitContext = async (data: DefaultContextData) => {
    setIsSavingContext(true);
    try {
      await updateContext.mutateAsync(data);
    } finally {
      setIsSavingContext(false);
    }
  };

  // Handle recalculate style
  const handleRecalculateStyle = async () => {
    if (!user) return;

    setIsRecalculating(true);
    try {
      const { error } = await supabase.functions.invoke('analyze-style', {
        body: { userId: user.id },
      });

      if (error) throw error;

      toast.success('Your communication style has been successfully recalculated!');
      await initialize();
      const updatedUser = useAuthStore.getState().user;
      setLearnedStyle((updatedUser as any)?.style_profile);
    } catch (error: any) {
      console.error('Failed to recalculate style:', error);
      toast.error(error.message || 'Failed to recalculate style. Please try again.');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Handle reset style
  const handleResetStyle = async () => {
    if (!user) return;
    if (!confirm('Are you sure you want to reset your learned communication style?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ style_profile: null })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Your communication style has been reset to default.');
      await initialize();
      setLearnedStyle(null);
    } catch (error: any) {
      console.error('Failed to reset style:', error);
      toast.error('Failed to reset style. Please try again.');
    }
  };

  if (authLoading || profileLoading) {
    return (
      <SettingsLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading preferences...</p>
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
      {/* Communication Style Section */}
      <form onSubmit={styleForm.handleSubmit(onSubmitStyle)}>
        <SettingsSection
          title="Communication Style"
          description="Set your default communication preferences for generated responses"
        >
          {/* Formality */}
          <SettingsField
            label="Formality Level"
            description="How formal should your responses be?"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['casual', 'professional', 'formal'] as const).map((option) => (
                <label
                  key={option}
                  className={`relative flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-all ${
                    styleForm.watch('formality') === option
                      ? 'border-green-600 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 font-medium'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  <input
                    {...styleForm.register('formality')}
                    type="radio"
                    value={option}
                    className="sr-only"
                  />
                  <span className="capitalize">{option}</span>
                </label>
              ))}
            </div>
          </SettingsField>

          {/* Tone */}
          <SettingsField
            label="Tone"
            description="What tone should your responses have?"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['friendly', 'neutral', 'firm'] as const).map((option) => (
                <label
                  key={option}
                  className={`relative flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-all ${
                    styleForm.watch('tone') === option
                      ? 'border-green-600 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 font-medium'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  <input
                    {...styleForm.register('tone')}
                    type="radio"
                    value={option}
                    className="sr-only"
                  />
                  <span className="capitalize">{option}</span>
                </label>
              ))}
            </div>
          </SettingsField>

          {/* Length */}
          <SettingsField
            label="Response Length"
            description="How detailed should your responses be?"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['concise', 'standard', 'detailed'] as const).map((option) => (
                <label
                  key={option}
                  className={`relative flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-all ${
                    styleForm.watch('length') === option
                      ? 'border-green-600 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 font-medium'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  <input
                    {...styleForm.register('length')}
                    type="radio"
                    value={option}
                    className="sr-only"
                  />
                  <span className="capitalize">{option}</span>
                </label>
              ))}
            </div>
          </SettingsField>
        </SettingsSection>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            type="submit"
            disabled={!styleForm.formState.isDirty || isSavingStyle}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSavingStyle ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              'Save Style Preferences'
            )}
          </button>
        </div>
      </form>

      <SettingsDivider />

      {/* Default Context Section */}
      <form onSubmit={contextForm.handleSubmit(onSubmitContext)}>
        <SettingsSection
          title="Default Context"
          description="Set default context values to speed up response generation"
        >
          {/* Relationship Stage */}
          <SettingsField label="Relationship Stage">
            <select
              {...contextForm.register('relationshipStage')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="new">New Client</option>
              <option value="established">Established Relationship</option>
              <option value="long-term">Long-term Partnership</option>
            </select>
          </SettingsField>

          {/* Project Phase */}
          <SettingsField label="Project Phase">
            <select
              {...contextForm.register('projectPhase')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="discovery">Discovery / Planning</option>
              <option value="active">Active Development</option>
              <option value="completion">Near Completion</option>
              <option value="maintenance">Maintenance / Support</option>
            </select>
          </SettingsField>

          {/* Urgency */}
          <SettingsField label="Default Urgency">
            <select
              {...contextForm.register('urgency')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="low">Low Priority</option>
              <option value="standard">Standard</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </SettingsField>

          {/* Message Type */}
          <SettingsField label="Message Type">
            <select
              {...contextForm.register('messageType')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="update">Project Update</option>
              <option value="question">Question / Clarification</option>
              <option value="request">Client Request</option>
              <option value="issue">Issue / Problem</option>
              <option value="general">General Message</option>
            </select>
          </SettingsField>
        </SettingsSection>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            type="submit"
            disabled={!contextForm.formState.isDirty || isSavingContext}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSavingContext ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              'Save Context Preferences'
            )}
          </button>
        </div>
      </form>

      <SettingsDivider />

      {/* Learned Communication Style Section */}
      <SettingsSection
        title="Learned Communication Style"
        description="FreelanceFlow learns from your highly-rated and copied responses to match your unique communication style"
      >
        {learnedStyle ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">Active Style Profile</p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">{learnedStyle.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">Formality</h4>
                <p className="text-sm text-gray-900 dark:text-gray-100 capitalize">{learnedStyle.formality}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">Tone</h4>
                <p className="text-sm text-gray-900 dark:text-gray-100 capitalize">{learnedStyle.tone}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRecalculateStyle}
                disabled={isRecalculating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {isRecalculating ? 'Recalculating...' : 'Recalculate My Style'}
              </button>
              <button
                onClick={handleResetStyle}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
              >
                Reset My Style
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              No communication style learned yet. Rate responses highly (4-5 stars) or copy
              responses to help FreelanceFlow learn your style. You need at least 5 high-quality
              responses to generate a style profile.
            </p>
            <button
              onClick={handleRecalculateStyle}
              disabled={isRecalculating}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {isRecalculating ? 'Analyzing...' : 'Try to Generate Style Profile'}
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          Style analysis is performed automatically when you rate responses 4-5 stars or copy
          responses. Manual recalculation analyzes your recent high-quality responses.
        </p>
      </SettingsSection>
    </SettingsLayout>
  );
}

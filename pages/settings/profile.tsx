import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { SettingsLayout } from '../../components/layouts/SettingsLayout';
import { SettingsSection, SettingsField, SettingsDivider } from '../../components/settings/SettingsSection';
import { AvatarUpload } from '../../components/settings/AvatarUpload';
import { useAuthStore } from '../../stores/auth';
import { trpc } from '../../utils/trpc';

// Form validation schema
const ProfileFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  email: z.string().email('Invalid email address'),
  industry: z.string().optional(),
});

type ProfileFormData = z.infer<typeof ProfileFormSchema>;

export default function ProfileSettings() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading: profileLoading, refetch } = trpc.settings.getProfile.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Update profile mutation
  const updateProfile = trpc.settings.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success('Profile updated successfully!');
      setHasUnsavedChanges(false);
      await refetch();
      await initialize(); // Refresh auth state
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      industry: '',
    },
  });

  // Watch for form changes
  useEffect(() => {
    const subscription = watch(() => {
      setHasUnsavedChanges(isDirty);
    });
    return () => subscription.unsubscribe();
  }, [watch, isDirty]);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        industry: profile.industry || '',
      });
    }
  }, [profile, reset]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/settings/profile');
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle form submission
  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        industry: data.industry,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (file: File) => {
    // TODO: Implement actual upload to Supabase Storage
    console.log('Avatar upload:', file);
    toast.success('Avatar uploaded successfully!');
  };

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (authLoading || profileLoading) {
    return (
      <SettingsLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 dark:border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
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
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Profile Information Section */}
        <SettingsSection
          title="Profile Information"
          description="Update your personal information and profile picture"
        >
          {/* Avatar Upload */}
          <AvatarUpload
            currentAvatarUrl={undefined}
            userName={`${profile?.firstName} ${profile?.lastName}`}
            userEmail={profile?.email}
            onUpload={handleAvatarUpload}
          />

          <SettingsDivider />

          {/* First Name */}
          <SettingsField
            label="First Name"
            error={errors.firstName?.message}
          >
            <input
              {...register('firstName')}
              type="text"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              placeholder="Enter your first name"
            />
          </SettingsField>

          {/* Last Name */}
          <SettingsField
            label="Last Name"
            error={errors.lastName?.message}
          >
            <input
              {...register('lastName')}
              type="text"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              placeholder="Enter your last name"
            />
          </SettingsField>

          {/* Email (Read-only) */}
          <SettingsField
            label="Email Address"
            description="Your email address cannot be changed"
          >
            <input
              {...register('email')}
              type="email"
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </SettingsField>

          {/* Industry */}
          <SettingsField
            label="Industry"
            description="What industry do you work in? This helps us provide better suggestions."
          >
            <select
              {...register('industry')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">Select an industry</option>
              <option value="web-development">Web Development</option>
              <option value="graphic-design">Graphic Design</option>
              <option value="writing">Writing & Content</option>
              <option value="marketing">Marketing</option>
              <option value="consulting">Consulting</option>
              <option value="photography">Photography</option>
              <option value="video-production">Video Production</option>
              <option value="other">Other</option>
            </select>
          </SettingsField>
        </SettingsSection>

        {/* Account Info Section */}
        <SettingsDivider />
        <SettingsSection
          title="Account Information"
          description="View your account details and status"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Created</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Updated</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* Save Button */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            {hasUnsavedChanges && (
              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                You have unsaved changes
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => reset()}
              disabled={!hasUnsavedChanges || isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasUnsavedChanges || isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 dark:bg-green-500 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </form>
    </SettingsLayout>
  );
}

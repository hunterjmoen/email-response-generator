import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  BellAlertIcon,
  XMarkIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { trpc } from '../../lib/trpc';
import toast from 'react-hot-toast';

interface Reminder {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  relationshipStage: string;
  priority: string;
  lastContactDate: string;
  daysSinceContact: number;
  followUpInterval: number;
  healthScore: number;
}

interface FollowUpRemindersWidgetProps {
  limit?: number;
}

export function FollowUpRemindersWidget({ limit = 5 }: FollowUpRemindersWidgetProps) {
  const router = useRouter();
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [snoozingId, setSnoozingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.reminders.list.useQuery();
  const dismissMutation = trpc.reminders.dismiss.useMutation();
  const snoozeMutation = trpc.reminders.snooze.useMutation();

  const reminders = data?.reminders?.slice(0, limit) || [];

  const handleDismiss = async (clientId: string) => {
    setDismissingId(clientId);
    try {
      await dismissMutation.mutateAsync({ clientId });
      toast.success('Reminder dismissed');
      refetch();
    } catch (error) {
      toast.error('Failed to dismiss reminder');
    } finally {
      setDismissingId(null);
    }
  };

  const handleSnooze = async (clientId: string, days: number = 3) => {
    setSnoozingId(clientId);
    try {
      await snoozeMutation.mutateAsync({ clientId, days });
      toast.success(`Snoozed for ${days} days`);
      refetch();
    } catch (error) {
      toast.error('Failed to snooze reminder');
    } finally {
      setSnoozingId(null);
    }
  };

  const handleGenerateMessage = (client: Reminder) => {
    // Navigate to generate page with client pre-selected
    router.push(`/dashboard/generate?clientId=${client.id}`);
  };

  const formatLastContact = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    if (weeks === 1) return '1 week ago';
    if (weeks < 4) return `${weeks} weeks ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return '1 month ago';
    return `${months} months ago`;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BellAlertIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Follow-Up Reminders
          </h3>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!reminders || reminders.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BellAlertIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Follow-Up Reminders
          </h3>
        </div>
        <div className="text-center py-8">
          <BellAlertIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No follow-ups needed right now
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
            You're all caught up!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BellAlertIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Follow-Up Reminders
          </h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            {data?.count || 0}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {reminder.name}
                  </h4>
                  {reminder.company && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      • {reminder.company}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <span>Last contact: {formatLastContact(reminder.daysSinceContact)}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    ({reminder.daysSinceContact} of {reminder.followUpInterval} days)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleGenerateMessage(reminder)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white text-sm font-medium rounded-md transition-colors"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                Generate Message
              </button>

              <button
                onClick={() => handleSnooze(reminder.id, 3)}
                disabled={snoozingId === reminder.id}
                className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                title="Snooze for 3 days"
              >
                <ClockIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Snooze</span>
              </button>

              <button
                onClick={() => handleDismiss(reminder.id)}
                disabled={dismissingId === reminder.id}
                className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                title="Dismiss"
              >
                <XMarkIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Dismiss</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {data && data.count > limit && (
        <button
          onClick={() => router.push('/dashboard/clients')}
          className="w-full mt-4 text-green-600 dark:text-green-400 text-sm font-medium hover:underline"
        >
          View all {data.count} reminders →
        </button>
      )}
    </div>
  );
}

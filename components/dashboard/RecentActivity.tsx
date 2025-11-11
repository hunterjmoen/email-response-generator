import { useRouter } from 'next/router';
import { StarIcon, ClockIcon } from '@heroicons/react/24/solid';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

interface Activity {
  id: string;
  timestamp: string;
  rating: number | null;
  templateUsed: string | null;
  messageType: string;
  preview: string;
}

interface RecentActivityProps {
  activities: Activity[];
  isLoading?: boolean;
}

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  const router = useRouter();

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const getMessageTypeLabel = (messageType: string) => {
    const labels: Record<string, string> = {
      update: 'Status Update',
      question: 'Question',
      concern: 'Concern',
      deliverable: 'Deliverable',
      payment: 'Payment',
      scope_change: 'Scope Change',
    };
    return labels[messageType] || messageType;
  };

  const getMessageTypeColor = (messageType: string) => {
    const colors: Record<string, string> = {
      update: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      question: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      concern: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      deliverable: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      payment: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      scope_change: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    };
    return colors[messageType] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Recent Activity
        </h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Recent Activity
        </h3>
        <div className="text-center py-8">
          <ClockIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No responses generated yet
          </p>
          <button
            onClick={() => router.push('/dashboard/generate')}
            className="mt-4 text-green-600 dark:text-green-400 text-sm font-medium hover:underline"
          >
            Generate your first response →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recent Activity
        </h3>
        <button
          onClick={() => router.push('/dashboard/history')}
          className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium flex items-center gap-1"
        >
          View All
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            onClick={() => router.push(`/dashboard/history/${activity.id}`)}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`
                    text-xs px-2 py-1 rounded-full font-medium
                    ${getMessageTypeColor(activity.messageType)}
                  `}>
                    {getMessageTypeLabel(activity.messageType)}
                  </span>
                  {activity.templateUsed && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.templateUsed}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">
                  {activity.preview}
                </p>

                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5" />
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                  {activity.rating && (
                    <span className="flex items-center gap-1">
                      <StarIcon className="w-3.5 h-3.5 text-yellow-500" />
                      {activity.rating}
                    </span>
                  )}
                </div>
              </div>

              <ArrowRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors flex-shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

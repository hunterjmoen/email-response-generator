import { useRouter } from 'next/router';
import { UsersIcon, ArrowRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ActiveClient {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  relationshipStage: string;
  lastContactDays: number;
  status: 'active' | 'warning' | 'attention';
}

interface ActiveClientsWidgetProps {
  clients: ActiveClient[];
  isLoading?: boolean;
}

export function ActiveClientsWidget({ clients, isLoading }: ActiveClientsWidgetProps) {
  const router = useRouter();

  const getStatusConfig = (status: 'active' | 'warning' | 'attention') => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
          dotColor: 'bg-green-500',
          label: 'Active',
        };
      case 'warning':
        return {
          color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
          dotColor: 'bg-yellow-500',
          label: 'Check In',
        };
      case 'attention':
        return {
          color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
          dotColor: 'bg-red-500',
          label: 'Needs Attention',
        };
    }
  };

  const formatLastContact = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    if (weeks === 1) return '1 week ago';
    return `${weeks} weeks ago`;
  };

  const getRelationshipLabel = (stage: string) => {
    const labels: Record<string, string> = {
      new: 'New Client',
      established: 'Established',
      difficult: 'Difficult',
      long_term: 'Long-term',
    };
    return labels[stage] || stage;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Active Clients
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

  if (!clients || clients.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Active Clients
        </h3>
        <div className="text-center py-8">
          <UsersIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No clients added yet
          </p>
          <button
            onClick={() => router.push('/dashboard/clients?action=add')}
            className="mt-4 text-green-600 dark:text-green-400 text-sm font-medium hover:underline"
          >
            Add your first client →
          </button>
        </div>
      </div>
    );
  }

  const needsAttention = clients.filter(c => c.status === 'attention').length;
  const needsWarning = clients.filter(c => c.status === 'warning').length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Active Clients
          </h3>
          {(needsAttention > 0 || needsWarning > 0) && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {needsAttention > 0 && `${needsAttention} need${needsAttention === 1 ? 's' : ''} attention`}
              {needsAttention > 0 && needsWarning > 0 && ' • '}
              {needsWarning > 0 && `${needsWarning} to check in`}
            </p>
          )}
        </div>
        <button
          onClick={() => router.push('/dashboard/clients')}
          className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium flex items-center gap-1"
        >
          View All
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {clients.slice(0, 6).map((client) => {
          const statusConfig = getStatusConfig(client.status);

          return (
            <div
              key={client.id}
              onClick={() => router.push(`/dashboard/clients/${client.id}`)}
              className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`}></div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {client.name}
                    </p>
                    {client.status === 'attention' && (
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                  </div>

                  {client.company && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">
                      {client.company}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full
                      ${statusConfig.color}
                    `}>
                      {statusConfig.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Last contact: {formatLastContact(client.lastContactDays)}
                    </span>
                  </div>
                </div>

                <ArrowRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors flex-shrink-0 mt-1" />
              </div>
            </div>
          );
        })}
      </div>

      {clients.length > 6 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/dashboard/clients')}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium"
          >
            +{clients.length - 6} more clients
          </button>
        </div>
      )}
    </div>
  );
}

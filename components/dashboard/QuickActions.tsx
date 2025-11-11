import { useRouter } from 'next/router';
import { SparklesIcon, UserPlusIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      id: 'generate',
      label: 'Generate Response',
      description: 'Create AI-powered responses to client messages',
      icon: SparklesIcon,
      href: '/dashboard/generate',
      primary: true,
      shortcut: 'Cmd+N',
    },
    {
      id: 'add-client',
      label: 'Add Client',
      description: 'Add a new client to your database',
      icon: UserPlusIcon,
      href: '/dashboard/clients?action=add',
      primary: false,
    },
    {
      id: 'history',
      label: 'View History',
      description: 'Browse your response history',
      icon: ClockIcon,
      href: '/dashboard/history',
      primary: false,
    },
    {
      id: 'templates',
      label: 'Browse Templates',
      description: 'Explore pre-built scenario templates',
      icon: DocumentTextIcon,
      href: '/dashboard/generate?tab=templates',
      primary: false,
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Quick Actions
      </h3>

      <div className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.id}
              onClick={() => router.push(action.href)}
              className={`
                w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left
                ${action.primary
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-transparent text-white shadow-sm hover:shadow-md'
                  : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600'
                }
              `}
            >
              <div className={`
                p-2 rounded-lg flex-shrink-0
                ${action.primary
                  ? 'bg-white bg-opacity-20'
                  : 'bg-white dark:bg-gray-600'
                }
              `}>
                <Icon className={`
                  w-5 h-5
                  ${action.primary ? 'text-white' : 'text-green-600 dark:text-green-400'}
                `} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`
                    font-medium text-sm
                    ${action.primary
                      ? 'text-white'
                      : 'text-gray-900 dark:text-gray-100'
                    }
                  `}>
                    {action.label}
                  </p>
                  {action.shortcut && (
                    <span className="text-xs px-2 py-0.5 rounded bg-white bg-opacity-20 text-white font-mono">
                      {action.shortcut}
                    </span>
                  )}
                </div>
                <p className={`
                  text-xs mt-0.5
                  ${action.primary
                    ? 'text-white text-opacity-90'
                    : 'text-gray-600 dark:text-gray-400'
                  }
                `}>
                  {action.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

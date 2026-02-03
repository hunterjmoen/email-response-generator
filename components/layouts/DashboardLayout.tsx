import { ReactNode } from 'react';
import { DashboardSidebar } from '../navigation/DashboardSidebar';
import { useAuthStore } from '../../stores/auth';
import { useUIStore } from '../../stores/ui';
import { UserProfileMenu } from '../UserProfileMenu';
import ThemeToggle from '../shared/ThemeToggle';
import { FeedbackButton } from '../feedback';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  showHeader?: boolean;
}

export function DashboardLayout({
  children,
  title = 'FreelanceFlow',
  showHeader = true
}: DashboardLayoutProps) {
  const { user, isAuthenticated } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, toggleMobileSidebar, setMobileSidebarOpen } = useUIStore();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <DashboardSidebar
          user={user}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 z-50 w-64">
            <DashboardSidebar
              user={user}
              isCollapsed={false}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        {showHeader && (
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger menu */}
              <button
                onClick={toggleMobileSidebar}
                className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors md:hidden"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <ThemeToggle />
              {isAuthenticated && <UserProfileMenu />}
            </div>
          </header>
        )}

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {isAuthenticated && <FeedbackButton />}
    </div>
  );
}

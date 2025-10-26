import { ReactNode } from 'react';
import { DashboardSidebar } from '../navigation/DashboardSidebar';
import { useAuthStore } from '../../stores/auth';
import { UserProfileMenu } from '../UserProfileMenu';

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

  return (
    <div className="flex h-screen bg-gray-50">
      <DashboardSidebar user={user} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {showHeader && (
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {isAuthenticated && <UserProfileMenu />}
            </div>
          </header>
        )}

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

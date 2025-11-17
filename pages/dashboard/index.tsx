import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { HeroStats, QuickActions, RecentActivity, ActiveClientsWidget } from '../../components/dashboard';
import { trpc } from '../../utils/trpc';

export default function Dashboard() {
  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getStats.useQuery();
  const { data: recentActivity, isLoading: activityLoading } = trpc.dashboard.getRecentActivity.useQuery({ limit: 10 });
  const { data: activeClients, isLoading: clientsLoading } = trpc.dashboard.getActiveClients.useQuery({ limit: 10 });

  return (
    <ProtectedRoute>
      <DashboardLayout title="Dashboard">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Stats */}
          {stats ? (
            <HeroStats stats={stats} />
          ) : (
            <div className="mb-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <QuickActions />
              <RecentActivity activities={recentActivity as any || []} isLoading={activityLoading} />
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              <ActiveClientsWidget clients={activeClients as any || []} isLoading={clientsLoading} />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
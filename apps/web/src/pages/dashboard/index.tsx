import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { useAuthStore } from '../../stores/auth';
import { trpc } from '../../utils/trpc';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      clearAuth();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear auth anyway in case of error
      clearAuth();
      router.push('/auth/login');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">FreelanceFlow</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700 dark:text-gray-300">
                  Welcome, {user?.firstName} {user?.lastName}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">
                Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Welcome to your FreelanceFlow dashboard. This is where you'll manage your AI-powered client communications.
              </p>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-primary-50 dark:bg-primary-900/30 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-primary-900 dark:text-primary-300">User Profile</h3>
                  <div className="mt-2 text-sm text-primary-700 dark:text-primary-400">
                    <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
                    <p><strong>Email:</strong> {user?.email}</p>
                    {user?.industry && <p><strong>Industry:</strong> {user.industry}</p>}
                    <p><strong>Plan:</strong> {user?.subscription.tier}</p>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-green-900 dark:text-green-300">Quick Actions</h3>
                  <div className="mt-2">
                    <button className="btn-primary text-sm">
                      Generate Response
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Activity</h3>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>No recent activity</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

Dashboard.getLayout = function getLayout(page: React.ReactElement) {
  return <>{page}</>;
};
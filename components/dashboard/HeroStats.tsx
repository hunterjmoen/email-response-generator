import { ClockIcon, SparklesIcon, StarIcon, UsersIcon, ChartBarIcon, BoltIcon } from '@heroicons/react/24/outline';

interface HeroStatsProps {
  stats: {
    monthlyResponses: number;
    weeklyResponses: number;
    timeSavedHours: number;
    averageRating: number;
    activeClients: number;
    responseRate: number;
    usageCount: number;
    monthlyLimit: number;
    usagePercentage: number;
  };
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtitle?: string;
  iconColor?: string;
  bgColor?: string;
}

function StatCard({ icon: Icon, label, value, subtitle, iconColor = 'text-green-600', bgColor = 'bg-green-50' }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`${bgColor} dark:bg-opacity-10 p-3 rounded-lg`}>
          <Icon className={`w-6 h-6 ${iconColor} dark:opacity-90`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function HeroStats({ stats }: HeroStatsProps) {
  const isUnlimited = stats.monthlyLimit >= 999999;

  const formatUsage = () => {
    if (isUnlimited) {
      return `${stats.usageCount} / Unlimited`;
    }
    return `${stats.usageCount} / ${stats.monthlyLimit}`;
  };

  const formatTimeSaved = () => {
    if (stats.timeSavedHours < 1) {
      return `${Math.round(stats.timeSavedHours * 60)}m`;
    }
    return `~${stats.timeSavedHours}h`;
  };

  const formatRating = () => {
    if (stats.averageRating === 0) return 'N/A';
    return `${stats.averageRating.toFixed(1)}★`;
  };

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard Overview
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Your activity and productivity metrics this month
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={SparklesIcon}
          label="Responses Used"
          value={formatUsage()}
          subtitle={isUnlimited ? 'Premium plan' : `${stats.usagePercentage}% of monthly limit`}
          iconColor="text-green-600"
          bgColor="bg-green-50"
        />

        <StatCard
          icon={ClockIcon}
          label="Time Saved"
          value={formatTimeSaved()}
          subtitle="This month"
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
        />

        <StatCard
          icon={StarIcon}
          label="Avg Rating"
          value={formatRating()}
          subtitle="Response quality"
          iconColor="text-yellow-600"
          bgColor="bg-yellow-50"
        />

        <StatCard
          icon={UsersIcon}
          label="Active Clients"
          value={stats.activeClients}
          subtitle="Total clients"
          iconColor="text-purple-600"
          bgColor="bg-purple-50"
        />

        <StatCard
          icon={BoltIcon}
          label="This Week"
          value={stats.weeklyResponses}
          subtitle="Responses generated"
          iconColor="text-orange-600"
          bgColor="bg-orange-50"
        />

        <StatCard
          icon={ChartBarIcon}
          label="Response Rate"
          value={`${stats.responseRate}%`}
          subtitle="Utilization rate"
          iconColor="text-indigo-600"
          bgColor="bg-indigo-50"
        />
      </div>
    </div>
  );
}

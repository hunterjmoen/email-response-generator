import { Client } from '@freelance-flow/shared';
import { useMemo } from 'react';

interface ClientStatsProps {
  clients: Client[];
}

export function ClientStats({ clients }: ClientStatsProps) {
  const stats = useMemo(() => {
    const total = clients.length;
    const byStage = clients.reduce((acc, client) => {
      acc[client.relationshipStage] = (acc[client.relationshipStage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const needsAttention = clients.filter(c => c.relationshipStage === 'difficult').length;
    const newLeads = clients.filter(c => c.relationshipStage === 'new').length;
    const active = clients.filter(c => c.relationshipStage === 'established' || c.relationshipStage === 'long_term').length;

    const avgProjectCount = total > 0
      ? Math.round(clients.reduce((sum, c) => sum + (c.projectCount || 0), 0) / total * 10) / 10
      : 0;

    const highValue = clients.filter(c => (c.projectCount || 0) >= 5).length;

    return {
      total,
      byStage,
      needsAttention,
      newLeads,
      active,
      avgProjectCount,
      highValue,
    };
  }, [clients]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Clients */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Clients</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.total}</p>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Active Clients */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Clients</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.active}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.total > 0 ? Math.round(stats.active / stats.total * 100) : 0}% of total
            </p>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* New Leads */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New Leads</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.newLeads}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Avg {stats.avgProjectCount} projects/client
            </p>
          </div>
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
            <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Needs Attention */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Needs Attention</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.needsAttention}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.highValue} high-value clients (5+ projects)
            </p>
          </div>
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
            <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

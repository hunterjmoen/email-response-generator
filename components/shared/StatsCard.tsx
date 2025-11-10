import React, { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  iconColor?: string;
}

export function StatsCard({ icon, label, value, iconColor = 'text-green-600' }: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4">
        <div className={`${iconColor} dark:opacity-90 bg-opacity-10 dark:bg-opacity-20 p-3 rounded-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}

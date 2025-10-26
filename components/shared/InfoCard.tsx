import React, { ReactNode } from 'react';

interface InfoCardProps {
  icon: ReactNode;
  label: string;
  value: string | ReactNode;
  action?: ReactNode;
}

export function InfoCard({ icon, label, value, action }: InfoCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-start gap-3">
        <div className="text-gray-500 mt-0.5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            {label}
          </label>
          <div className="mt-1 flex items-center gap-2">
            <div className="text-gray-900 font-medium truncate">
              {value}
            </div>
            {action && (
              <div className="flex-shrink-0">
                {action}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

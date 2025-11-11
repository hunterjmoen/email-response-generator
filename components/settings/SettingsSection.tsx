import { ReactNode } from 'react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({ title, description, children, className = '' }: SettingsSectionProps) {
  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>
        )}
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

interface SettingsFieldProps {
  label: string;
  description?: string;
  children: ReactNode;
  error?: string;
}

export function SettingsField({ label, description, children, error }: SettingsFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
        {label}
      </label>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{description}</p>
      )}
      {children}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

export function SettingsDivider() {
  return <div className="border-t border-gray-200 dark:border-gray-700" />;
}

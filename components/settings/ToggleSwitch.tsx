interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function ToggleSwitch({ enabled, onChange, label, description, disabled = false }: ToggleSwitchProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        {label && (
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
            {label}
          </label>
        )}
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${enabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'}`}
        role="switch"
        aria-checked={enabled}
      >
        <span className="sr-only">{label || 'Toggle'}</span>
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

import { useEffect } from 'react';
import { useThemeStore } from '../../stores/theme';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export default function ThemeToggle({ showLabel = false, className = '' }: ThemeToggleProps) {
  const { theme, setTheme, initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        group relative inline-flex items-center justify-center
        rounded-lg p-2 text-gray-600 dark:text-gray-300
        hover:bg-gray-100 dark:hover:bg-gray-700
        focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400
        transition-all duration-200 ease-in-out
        ${className}
      `}
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative w-6 h-6">
        {/* Sun Icon - visible in dark mode */}
        <SunIcon
          className={`
            absolute inset-0 w-6 h-6
            transition-all duration-200 ease-in-out
            ${theme === 'dark'
              ? 'rotate-0 scale-100 opacity-100'
              : 'rotate-90 scale-0 opacity-0'
            }
          `}
        />
        {/* Moon Icon - visible in light mode */}
        <MoonIcon
          className={`
            absolute inset-0 w-6 h-6
            transition-all duration-200 ease-in-out
            ${theme === 'light'
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-0 opacity-0'
            }
          `}
        />
      </div>
      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {theme === 'light' ? 'Dark' : 'Light'} Mode
        </span>
      )}
    </button>
  );
}

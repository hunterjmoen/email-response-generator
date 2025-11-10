import { useThemeStore } from '../stores/theme';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 group"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Sun Icon (visible in dark mode) */}
      <SunIcon
        className={`w-5 h-5 transition-all duration-300 absolute inset-0 m-auto ${
          theme === 'dark'
            ? 'text-yellow-400 opacity-100 rotate-0 scale-100'
            : 'text-gray-400 opacity-0 rotate-90 scale-0'
        }`}
      />

      {/* Moon Icon (visible in light mode) */}
      <MoonIcon
        className={`w-5 h-5 transition-all duration-300 ${
          theme === 'light'
            ? 'text-gray-600 opacity-100 rotate-0 scale-100'
            : 'text-gray-400 opacity-0 -rotate-90 scale-0'
        }`}
      />
    </button>
  );
}

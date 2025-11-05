import { useThemeStore } from '../../stores/theme';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Dark Mode
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Switch between light and dark theme
        </p>
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-900
          ${theme === 'dark' ? 'bg-primary-600' : 'bg-gray-200'}
        `}
        role="switch"
        aria-checked={theme === 'dark'}
      >
        <span className="sr-only">Toggle dark mode</span>
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
};

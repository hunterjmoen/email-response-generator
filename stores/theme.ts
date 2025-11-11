import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  systemTheme: Theme | null;
}

interface ThemeActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initializeTheme: () => void;
}

type ThemeStore = ThemeState & ThemeActions;

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      // State
      theme: 'light',
      systemTheme: null,

      // Actions
      setTheme: (theme: Theme) => {
        set({ theme });

        // Update DOM immediately for instant transition
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement;
          root.classList.remove('light', 'dark');
          root.classList.add(theme);
        }
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      initializeTheme: () => {
        if (typeof window === 'undefined') return;

        // Detect system theme preference
        const systemTheme: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

        set({ systemTheme });

        // Apply stored or system theme
        const storedTheme = get().theme;
        const root = window.document.documentElement;

        root.classList.remove('light', 'dark');
        root.classList.add(storedTheme);

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
          const newSystemTheme: Theme = e.matches ? 'dark' : 'light';
          set({ systemTheme: newSystemTheme });
        };

        mediaQuery.addEventListener('change', handleChange);
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);

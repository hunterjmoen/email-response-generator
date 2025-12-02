import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
}

interface UIActions {
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // State
      sidebarCollapsed: false,

      // Actions
      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      toggleSidebar: () => {
        set({ sidebarCollapsed: !get().sidebarCollapsed });
      },
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

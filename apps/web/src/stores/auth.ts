import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthSession } from '@freelance-flow/shared';
import { supabase } from '../utils/supabase';

interface AuthState {
  user: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  setAuth: (user: User, session: any) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,

      // Actions
      setAuth: (user, session) => {
        set({
          user,
          session: {
            user,
            token: session?.access_token || '',
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : new Date().toISOString(),
          },
          isAuthenticated: true,
          isLoading: false,
        });
      },

      clearAuth: () => {
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      initialize: async () => {
        // If we already have a valid authenticated state, don't override it
        const currentState = get();
        if (currentState.isAuthenticated && currentState.user) {
          return;
        }

        try {
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.error('Error getting session:', error);
            get().clearAuth();
            return;
          }

          if (!session || !session.user) {
            get().clearAuth();
            return;
          }

          // Fetch user profile data
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*, subscriptions(*)')
            .eq('id', session.user.id)
            .single();

          if (userError || !userData) {
            console.error('Error fetching user data:', userError);
            get().clearAuth();
            return;
          }

          const user: User = {
            id: userData.id,
            email: userData.email,
            firstName: userData.first_name,
            lastName: userData.last_name,
            industry: userData.industry,
            communicationStyle: userData.communication_style,
            subscription: {
              tier: userData.subscriptions?.tier || 'free',
              status: userData.subscriptions?.status || 'active',
              usageCount: userData.subscriptions?.usage_count || 0,
              billingCycle: userData.subscriptions?.usage_reset_date || undefined,
            },
            preferences: userData.preferences,
            createdAt: userData.created_at,
            updatedAt: userData.updated_at,
          };

          get().setAuth(user, session);
        } catch (error) {
          console.error('Error initializing auth:', error);
          get().clearAuth();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
      skipHydration: true,
    }
  )
);

// Listen to auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  const { initialize, clearAuth } = useAuthStore.getState();
  
  if (event === 'SIGNED_OUT' || !session) {
    clearAuth();
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    await initialize();
  }
});
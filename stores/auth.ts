import { create } from 'zustand';
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

export const useAuthStore = create<AuthStore>((set, get) => ({
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
    try {
      console.log('[Auth] Initializing auth state from cookies...');

      // Get session from Supabase (reads from cookies now)
      const { data: { session }, error } = await supabase.auth.getSession();

      console.log('[Auth] Cookie-based session check:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        error: error?.message,
      });

      if (error || !session || !session.user) {
        console.log('[Auth] No valid session found');
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

      console.log('[Auth] Auth initialized successfully for user:', user.email);
      get().setAuth(user, session);
    } catch (error) {
      console.error('[Auth] Error initializing auth:', error);
      get().clearAuth();
    }
  },
}));

// Listen to auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  const { initialize, clearAuth } = useAuthStore.getState();
  
  if (event === 'SIGNED_OUT' || !session) {
    clearAuth();
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    await initialize();
  }
});
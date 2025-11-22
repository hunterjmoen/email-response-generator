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
  refreshSubscription: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      session: null,
      isLoading: false,
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

      // Fetch user profile data - optimized to avoid slow JOIN
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData) {
        console.error('Error fetching user data:', userError);
        get().clearAuth();
        return;
      }

      // Fetch subscription separately for better performance
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('tier, status, usage_count, monthly_limit, usage_reset_date, stripe_customer_id, stripe_subscription_id')
        .eq('user_id', session.user.id)
        .single();

      const user: User = {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name ?? '',
        lastName: userData.last_name ?? '',
        industry: userData.industry ?? undefined,
        communicationStyle: (userData.communication_style as User['communicationStyle']) || {
          formality: 'professional',
          tone: 'neutral',
          length: 'standard',
        },
        subscription: {
          tier: (subscriptionData?.tier as User['subscription']['tier']) || 'free',
          status: (subscriptionData?.status as User['subscription']['status']) || 'active',
          usageCount: subscriptionData?.usage_count || 0,
          monthlyLimit: subscriptionData?.monthly_limit || 10,
          billingCycle: subscriptionData?.usage_reset_date || undefined,
          stripe_customer_id: subscriptionData?.stripe_customer_id || undefined,
          stripe_subscription_id: subscriptionData?.stripe_subscription_id || undefined,
        },
        stripe_customer_id: subscriptionData?.stripe_customer_id || undefined,
        preferences: (userData.preferences as unknown as User['preferences']) || {
          defaultContext: {
            relationshipStage: 'established',
            projectPhase: 'active',
            urgency: 'standard',
            messageType: 'update',
          },
          emailNotifications: true,
        },
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

      refreshSubscription: async () => {
        const { user } = get();
        if (!user) return;

        try {
          console.log('[Auth] Refreshing subscription data...');

          // Fetch updated subscription data
          const { data: subscriptionData, error } = await supabase
            .from('subscriptions')
            .select('tier, status, usage_count, monthly_limit, usage_reset_date, stripe_customer_id, stripe_subscription_id')
            .eq('user_id', user.id)
            .single();

          if (error || !subscriptionData) {
            console.error('Error fetching subscription data:', error);
            return;
          }

          // Update user object with fresh subscription data
          const updatedUser: User = {
            ...user,
            subscription: {
              tier: subscriptionData.tier as User['subscription']['tier'],
              status: subscriptionData.status as User['subscription']['status'],
              usageCount: subscriptionData.usage_count,
              monthlyLimit: subscriptionData.monthly_limit,
              billingCycle: subscriptionData.usage_reset_date || undefined,
              stripe_customer_id: subscriptionData.stripe_customer_id || undefined,
              stripe_subscription_id: subscriptionData.stripe_subscription_id || undefined,
            },
            stripe_customer_id: subscriptionData.stripe_customer_id || undefined,
          };

          console.log('[Auth] Subscription refreshed. Usage:', subscriptionData.usage_count);
          set({ user: updatedUser });
        } catch (error) {
          console.error('[Auth] Error refreshing subscription:', error);
        }
      },
    }),
    {
      name: 'auth-storage', // unique name for localStorage
      storage: createJSONStorage(() => localStorage),
      // Only persist user, session, and isAuthenticated - not loading state
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth state immediately when store is created
useAuthStore.getState().initialize();

// Listen to auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  const { initialize, clearAuth, user } = useAuthStore.getState();

  console.log('[Auth] onAuthStateChange event:', event, 'has session:', !!session, 'has user in store:', !!user);

  if (event === 'SIGNED_OUT' || !session) {
    clearAuth();
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    // Only re-initialize if we don't already have user data in the store
    // This prevents duplicate initialization when login manually sets the session
    if (!user) {
      console.log('[Auth] No user in store, initializing...');
      await initialize();
    } else {
      console.log('[Auth] User already in store, skipping initialization');
    }
  }
});
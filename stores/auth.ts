import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthSession } from '@freelance-flow/shared';
import { supabase } from '../utils/supabase';
import { useResponseGenerationStore } from './response-generation';

// Client-side development logging
const isDev = process.env.NODE_ENV === 'development';
const devLog = {
  log: (...args: unknown[]) => { if (isDev) console.log(...args); },
  error: (...args: unknown[]) => { if (isDev) console.error(...args); },
};

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
        // Clear response generation store to prevent data leakage between users
        useResponseGenerationStore.getState().reset();
        // Clear streaming responses from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('streamingResponses');
        }
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      initialize: async () => {
    try {
      devLog.log('[Auth] Initializing auth state from cookies...');

      // Get session from Supabase (reads from cookies now)
      const { data: { session }, error } = await supabase.auth.getSession();

      devLog.log('[Auth] Cookie-based session check:', {
        hasSession: !!session,
        hasUser: !!session?.user,
      });

      if (error || !session || !session.user) {
        devLog.log('[Auth] No valid session found');
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
        devLog.error('Error fetching user data:', userError);
        get().clearAuth();
        return;
      }

      // Fetch subscription separately for better performance
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('tier, status, usage_count, monthly_limit, usage_reset_date, billing_interval, has_used_trial, stripe_customer_id, stripe_subscription_id, cancel_at_period_end')
        .eq('user_id', session.user.id)
        .single();

      // Helper to extract ID from potentially stringified JSON objects
      const extractId = (value: string | null | undefined): string | undefined => {
        if (!value) return undefined;
        try {
          const parsed = JSON.parse(value);
          return parsed.id || value;
        } catch {
          return value;
        }
      };

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
          tier: ((subscriptionData as any)?.tier as User['subscription']['tier']) || 'free',
          status: ((subscriptionData as any)?.status as User['subscription']['status']) || 'active',
          usageCount: (subscriptionData as any)?.usage_count || 0,
          monthlyLimit: (subscriptionData as any)?.monthly_limit || 10,
          billingCycle: (subscriptionData as any)?.usage_reset_date || undefined,
          billing_interval: (subscriptionData as any)?.billing_interval as 'monthly' | 'annual' | undefined,
          has_used_trial: (subscriptionData as any)?.has_used_trial || false,
          stripe_customer_id: extractId((subscriptionData as any)?.stripe_customer_id),
          stripe_subscription_id: extractId((subscriptionData as any)?.stripe_subscription_id),
          cancel_at_period_end: (subscriptionData as any)?.cancel_at_period_end || false,
        },
        stripe_customer_id: extractId((subscriptionData as any)?.stripe_customer_id),
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

      devLog.log('[Auth] Auth initialized successfully');
      get().setAuth(user, session);
    } catch (error) {
      devLog.error('[Auth] Error initializing auth:', error);
      get().clearAuth();
    }
  },

      refreshSubscription: async () => {
        const { user } = get();
        if (!user) return;

        try {
          devLog.log('[Auth] Refreshing subscription data...');

          // Fetch updated subscription data
          const { data: subscriptionData, error } = await supabase
            .from('subscriptions')
            .select('tier, status, usage_count, monthly_limit, usage_reset_date, billing_interval, has_used_trial, stripe_customer_id, stripe_subscription_id, cancel_at_period_end')
            .eq('user_id', user.id)
            .single();

          if (error || !subscriptionData) {
            devLog.error('Error fetching subscription data:', error);
            return;
          }

          // Helper to extract ID from potentially stringified JSON objects
          const extractId = (value: string | null | undefined): string | undefined => {
            if (!value) return undefined;
            try {
              const parsed = JSON.parse(value);
              return parsed.id || value;
            } catch {
              return value;
            }
          };

          // Update user object with fresh subscription data
          const updatedUser: User = {
            ...user,
            subscription: {
              tier: (subscriptionData as any).tier as User['subscription']['tier'],
              status: (subscriptionData as any).status as User['subscription']['status'],
              usageCount: (subscriptionData as any).usage_count,
              monthlyLimit: (subscriptionData as any).monthly_limit,
              billingCycle: (subscriptionData as any).usage_reset_date || undefined,
              billing_interval: (subscriptionData as any).billing_interval as 'monthly' | 'annual' | undefined,
              has_used_trial: (subscriptionData as any).has_used_trial || false,
              stripe_customer_id: extractId((subscriptionData as any).stripe_customer_id),
              stripe_subscription_id: extractId((subscriptionData as any).stripe_subscription_id),
              cancel_at_period_end: (subscriptionData as any).cancel_at_period_end || false,
            },
            stripe_customer_id: extractId((subscriptionData as any).stripe_customer_id),
          };

          devLog.log('[Auth] Subscription refreshed');
          set({ user: updatedUser });
        } catch (error) {
          devLog.error('[Auth] Error refreshing subscription:', error);
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

  devLog.log('[Auth] onAuthStateChange event:', event, 'has session:', !!session);

  if (event === 'SIGNED_OUT' || !session) {
    clearAuth();
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    // Only re-initialize if we don't already have user data in the store
    // This prevents duplicate initialization when login manually sets the session
    if (!user) {
      devLog.log('[Auth] No user in store, initializing...');
      await initialize();
    } else {
      devLog.log('[Auth] User already in store, skipping initialization');
    }
  }
});
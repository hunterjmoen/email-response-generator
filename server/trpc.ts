import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import type { User } from '@freelance-flow/shared';
import { createRateLimitMiddleware } from './middleware/rateLimit';
import type { Database } from '../types/supabase';

// Create server-side Supabase client with service role for admin operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface Context {
  user?: User;
  req?: CreateNextContextOptions['req'];
  res?: CreateNextContextOptions['res'];
  supabase: SupabaseClient<Database>;
}

export const createContext = async (opts: CreateNextContextOptions): Promise<Context> => {
  const { req, res } = opts;

  // Create Supabase client that reads from cookies
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Parse cookies from header string for Pages Router
          const cookieHeader = req.headers.cookie || '';
          const cookies = parseCookieHeader(cookieHeader);
          // Ensure all cookie values are strings (not undefined)
          return cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value || ''
          }));
        },
        setAll(cookiesToSet) {
          // Set cookies using proper serialization
          // IMPORTANT: setHeader with an array appends all cookies correctly
          const serialized = cookiesToSet.map((cookie) =>
            serializeCookieHeader(cookie.name, cookie.value, cookie.options)
          );
          res?.setHeader('Set-Cookie', serialized);
        },
      },
    }
  )

  try {
    // Get user from session cookie
    const { data: { user }, error } = await supabase.auth.getUser();

    console.log('[tRPC Context] Session check:', {
      hasUser: !!user,
      userId: user?.id,
      error: error?.message,
    });

    if (error || !user) {
      return { req, res, supabase: supabaseAdmin };
    }

    // Fetch additional user data from our users table using admin client
    // Optimized to avoid slow JOIN - fetch separately
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single<Database['public']['Tables']['users']['Row']>();

    if (userError || !userData) {
      return { req, res, supabase: supabaseAdmin };
    }

    // Fetch subscription separately for better performance
    const { data: subscriptionData } = await supabaseAdmin
      .from('subscriptions')
      .select('tier, status, usage_count, monthly_limit, usage_reset_date')
      .eq('user_id', user.id)
      .single<Database['public']['Tables']['subscriptions']['Row']>();

    const fullUser: User = {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      industry: userData.industry || undefined,
      communicationStyle: (userData.communication_style as User['communicationStyle']) || {
        formality: 'professional',
        tone: 'neutral',
        length: 'standard'
      },
      subscription: {
        tier: (subscriptionData?.tier === 'professional' ? 'professional' : subscriptionData?.tier === 'premium' ? 'premium' : 'free') as 'free' | 'professional' | 'premium',
        status: (subscriptionData?.status === 'active' ? 'active' : subscriptionData?.status === 'cancelled' ? 'cancelled' : 'expired') as 'active' | 'cancelled' | 'expired',
        usageCount: subscriptionData?.usage_count || 0,
        monthlyLimit: subscriptionData?.monthly_limit || 10,
        billingCycle: subscriptionData?.usage_reset_date || undefined,
      },
      preferences: (userData.preferences as unknown as User['preferences']) || {
        defaultContext: {
          relationshipStage: 'established',
          projectPhase: 'active',
          urgency: 'standard',
          messageType: 'update'
        },
        emailNotifications: true
      },
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    };

    return { user: fullUser, req, res, supabase: supabaseAdmin };
  } catch (error) {
    console.error('Error creating context:', error);
    return { req, res, supabase: supabaseAdmin };
  }
};

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Rate-limited procedures for authentication endpoints
export const loginProcedure = t.procedure.use(createRateLimitMiddleware('LOGIN'));
export const registerProcedure = t.procedure.use(createRateLimitMiddleware('REGISTER'));
export const passwordResetProcedure = t.procedure.use(createRateLimitMiddleware('PASSWORD_RESET'));
export const generalAuthProcedure = t.procedure.use(createRateLimitMiddleware('GENERAL'));

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // user is now guaranteed to be defined
    },
  });
});
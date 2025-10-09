import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr'
import type { User } from '@freelance-flow/shared';
import { createRateLimitMiddleware } from './middleware/rateLimit';

// Create server-side Supabase client with service role for admin operations
const supabaseAdmin = createClient(
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
}

export const createContext = async (opts: CreateNextContextOptions): Promise<Context> => {
  const { req, res } = opts;

  // Create Supabase client that reads from cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.keys(req.cookies).map(name => ({
            name,
            value: req.cookies[name] || ''
          }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res?.setHeader('Set-Cookie', `${name}=${value}; Path=/; ${options?.maxAge ? `Max-Age=${options.maxAge};` : ''} ${options?.httpOnly ? 'HttpOnly;' : ''} ${options?.secure ? 'Secure;' : ''} ${options?.sameSite ? `SameSite=${options.sameSite};` : ''}`)
          })
        },
      },
    }
  )

  try {
    // Get user from session cookie
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { req, res };
    }

    // Fetch additional user data from our users table using admin client
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*, subscriptions(*)')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return { req };
    }

    const fullUser: User = {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      industry: userData.industry,
      communicationStyle: userData.communication_style || {
        formality: 'professional',
        tone: 'neutral',
        length: 'standard'
      },
      subscription: {
        tier: userData.subscriptions?.tier || 'free',
        status: userData.subscriptions?.status || 'active',
        usageCount: userData.subscriptions?.usage_count || 0,
        billingCycle: userData.subscriptions?.usage_reset_date || undefined,
      },
      preferences: userData.preferences || {
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

    return { user: fullUser, req };
  } catch (error) {
    console.error('Error creating context:', error);
    return { req };
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
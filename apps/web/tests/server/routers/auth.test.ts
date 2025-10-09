import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { authRouter } from '../../../src/server/routers/auth';
import type { Context } from '../../../src/server/trpc';

// Mock Supabase admin client
const mockSupabaseAdmin = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  },
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  })),
};

// Mock the Supabase client creation
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseAdmin),
}));

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}));

// Helper to create a mock tRPC context
const createMockContext = (user?: any): Context => ({
  user: user || undefined,
});

// Helper to call tRPC procedures
const createCaller = (ctx: Context) => {
  return authRouter.createCaller(ctx);
};

describe('AuthRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('register', () => {
    const validRegisterInput = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      industry: 'Technology',
    };

    it('should successfully register a user with valid input', async () => {
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
      const mockUserData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        industry: 'Technology',
        communication_style: null,
        preferences: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSupabaseAdmin.auth.signUp.mockResolvedValue({
        data: {
          user: mockAuthUser,
          session: { access_token: 'mock-token' },
        },
        error: null,
      });

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const caller = createCaller(createMockContext());
      const result = await caller.register(validRegisterInput);

      expect(result.user).toEqual(expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        industry: 'Technology',
      }));
      expect(result.message).toBe('Registration successful. Please check your email to verify your account.');
      expect(mockSupabaseAdmin.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback',
        },
      });
    });

    it('should throw BAD_REQUEST when Supabase auth signup fails', async () => {
      mockSupabaseAdmin.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      });

      const caller = createCaller(createMockContext());

      await expect(caller.register(validRegisterInput)).rejects.toThrow(
        new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Email already registered',
        })
      );
    });

    it('should throw INTERNAL_SERVER_ERROR when user creation succeeds but profile creation fails', async () => {
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabaseAdmin.auth.signUp.mockResolvedValue({
        data: { user: mockAuthUser, session: { access_token: 'mock-token' } },
        error: null,
      });

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' },
      });

      const caller = createCaller(createMockContext());

      await expect(caller.register(validRegisterInput)).rejects.toThrow(
        new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user profile',
        })
      );
    });

    it('should validate input and reject invalid email', async () => {
      const invalidInput = { ...validRegisterInput, email: 'invalid-email' };
      const caller = createCaller(createMockContext());

      await expect(caller.register(invalidInput)).rejects.toThrow();
    });

    it('should validate input and reject short password', async () => {
      const invalidInput = { ...validRegisterInput, password: '123' };
      const caller = createCaller(createMockContext());

      await expect(caller.register(invalidInput)).rejects.toThrow();
    });
  });

  describe('login', () => {
    const validLoginInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login with valid credentials', async () => {
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'mock-token' };
      const mockUserData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        industry: 'Technology',
        communication_style: null,
        preferences: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        subscriptions: {
          tier: 'premium',
          status: 'active',
          usage_count: 5,
          usage_reset_date: '2025-02-01T00:00:00Z',
        },
      };

      mockSupabaseAdmin.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockAuthUser, session: mockSession },
        error: null,
      });

      mockSupabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const caller = createCaller(createMockContext());
      const result = await caller.login(validLoginInput);

      expect(result.user).toEqual(expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      }));
      expect(result.user.subscription).toEqual({
        tier: 'premium',
        status: 'active',
        usageCount: 5,
        billingCycle: new Date('2025-02-01T00:00:00Z'),
      });
      expect(result.session).toBe(mockSession);
    });

    it('should handle user with default subscription values', async () => {
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'mock-token' };
      const mockUserData = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        industry: null,
        communication_style: null,
        preferences: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        subscriptions: null,
      };

      mockSupabaseAdmin.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockAuthUser, session: mockSession },
        error: null,
      });

      mockSupabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const caller = createCaller(createMockContext());
      const result = await caller.login(validLoginInput);

      expect(result.user.subscription).toEqual({
        tier: 'free',
        status: 'active',
        usageCount: 0,
        billingCycle: undefined,
      });
    });

    it('should throw UNAUTHORIZED for invalid credentials', async () => {
      mockSupabaseAdmin.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const caller = createCaller(createMockContext());

      await expect(caller.login(validLoginInput)).rejects.toThrow(
        new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        })
      );
    });

    it('should throw INTERNAL_SERVER_ERROR when profile fetch fails', async () => {
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'mock-token' };

      mockSupabaseAdmin.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockAuthUser, session: mockSession },
        error: null,
      });

      mockSupabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      const caller = createCaller(createMockContext());

      await expect(caller.login(validLoginInput)).rejects.toThrow(
        new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user profile',
        })
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout authenticated user', async () => {
      mockSupabaseAdmin.auth.signOut.mockResolvedValue({
        error: null,
      });

      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const caller = createCaller(createMockContext(mockUser));
      const result = await caller.logout();

      expect(result.message).toBe('Logout successful');
      expect(mockSupabaseAdmin.auth.signOut).toHaveBeenCalled();
    });

    it('should throw INTERNAL_SERVER_ERROR when logout fails', async () => {
      mockSupabaseAdmin.auth.signOut.mockResolvedValue({
        error: { message: 'Logout failed' },
      });

      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const caller = createCaller(createMockContext(mockUser));

      await expect(caller.logout()).rejects.toThrow(
        new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to logout',
        })
      );
    });

    it('should require authentication', async () => {
      const caller = createCaller(createMockContext());

      await expect(caller.logout()).rejects.toThrow(
        new TRPCError({
          code: 'UNAUTHORIZED',
        })
      );
    });
  });

  describe('requestPasswordReset', () => {
    const validResetInput = { email: 'test@example.com' };

    it('should successfully send password reset email', async () => {
      mockSupabaseAdmin.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      });

      const caller = createCaller(createMockContext());
      const result = await caller.requestPasswordReset(validResetInput);

      expect(result.message).toBe('If an account with that email exists, we have sent a password reset link.');
      expect(mockSupabaseAdmin.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: 'http://localhost:3000/auth/reset-password' }
      );
    });

    it('should throw BAD_REQUEST when reset email fails', async () => {
      mockSupabaseAdmin.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: 'Email not found' },
      });

      const caller = createCaller(createMockContext());

      await expect(caller.requestPasswordReset(validResetInput)).rejects.toThrow(
        new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Email not found',
        })
      );
    });

    it('should validate email format', async () => {
      const invalidInput = { email: 'invalid-email' };
      const caller = createCaller(createMockContext());

      await expect(caller.requestPasswordReset(invalidInput)).rejects.toThrow();
    });
  });

  describe('resetPassword', () => {
    const validResetPasswordInput = {
      token: 'valid-token',
      password: 'newpassword123',
    };

    it('should successfully reset password with valid token', async () => {
      mockSupabaseAdmin.auth.updateUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const caller = createCaller(createMockContext());
      const result = await caller.resetPassword(validResetPasswordInput);

      expect(result.message).toBe('Password updated successfully');
      expect(mockSupabaseAdmin.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      });
    });

    it('should throw BAD_REQUEST when password reset fails', async () => {
      mockSupabaseAdmin.auth.updateUser.mockResolvedValue({
        data: null,
        error: { message: 'Invalid token' },
      });

      const caller = createCaller(createMockContext());

      await expect(caller.resetPassword(validResetPasswordInput)).rejects.toThrow(
        new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid token',
        })
      );
    });

    it('should validate password length', async () => {
      const invalidInput = { ...validResetPasswordInput, password: '123' };
      const caller = createCaller(createMockContext());

      await expect(caller.resetPassword(invalidInput)).rejects.toThrow();
    });
  });

  describe('getProfile', () => {
    it('should return user profile for authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const caller = createCaller(createMockContext(mockUser));
      const result = await caller.getProfile();

      expect(result).toBe(mockUser);
    });

    it('should require authentication', async () => {
      const caller = createCaller(createMockContext());

      await expect(caller.getProfile()).rejects.toThrow(
        new TRPCError({
          code: 'UNAUTHORIZED',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully in register', async () => {
      mockSupabaseAdmin.auth.signUp.mockRejectedValue(new Error('Unexpected error'));

      const caller = createCaller(createMockContext());

      await expect(caller.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      })).rejects.toThrow(
        new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during registration',
        })
      );
    });

    it('should handle unexpected errors gracefully in login', async () => {
      mockSupabaseAdmin.auth.signInWithPassword.mockRejectedValue(new Error('Unexpected error'));

      const caller = createCaller(createMockContext());

      await expect(caller.login({
        email: 'test@example.com',
        password: 'password123',
      })).rejects.toThrow(
        new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during login',
        })
      );
    });
  });
});
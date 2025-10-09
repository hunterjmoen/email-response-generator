import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    query: {},
    asPath: '/',
    isReady: true,
  })),
}));

// Mock Supabase client
vi.mock('../src/utils/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

// Mock tRPC
vi.mock('../src/utils/trpc', () => ({
  trpc: {
    auth: {
      register: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
        }),
      },
      login: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
        }),
      },
      logout: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
        }),
      },
      requestPasswordReset: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
        }),
      },
    },
    withTRPC: (component: any) => component,
  },
}));
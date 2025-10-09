import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginForm } from '../../../src/components/auth/LoginForm';

// Mock the tRPC hook
const mockMutateAsync = vi.fn();
vi.mock('../../../src/utils/trpc', () => ({
  trpc: {
    auth: {
      login: {
        useMutation: () => ({
          mutateAsync: mockMutateAsync,
        }),
      },
    },
  },
}));

// Mock the auth store
vi.mock('../../../src/stores/auth', () => ({
  useAuthStore: () => ({
    setAuth: vi.fn(),
  }),
}));

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    query: {},
  }),
}));

describe('LoginForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnSwitchToRegister = vi.fn();
  const mockOnSwitchToPasswordReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(
      <LoginForm 
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToPasswordReset={mockOnSwitchToPasswordReset}
      />
    );
    
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <LoginForm 
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToPasswordReset={mockOnSwitchToPasswordReset}
      />
    );
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('submits form with valid credentials', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      user: { id: '1', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
      session: { access_token: 'token' },
    });

    render(
      <LoginForm 
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToPasswordReset={mockOnSwitchToPasswordReset}
      />
    );
    
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles login error', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Invalid credentials'));

    render(
      <LoginForm 
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToPasswordReset={mockOnSwitchToPasswordReset}
      />
    );
    
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpassword' } });
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('calls callback functions when links are clicked', () => {
    render(
      <LoginForm 
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToPasswordReset={mockOnSwitchToPasswordReset}
      />
    );
    
    fireEvent.click(screen.getByText('Forgot your password?'));
    expect(mockOnSwitchToPasswordReset).toHaveBeenCalled();
    
    fireEvent.click(screen.getByText("Don't have an account? Sign up"));
    expect(mockOnSwitchToRegister).toHaveBeenCalled();
  });
});
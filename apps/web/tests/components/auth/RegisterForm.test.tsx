import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterForm } from '../../../src/components/auth/RegisterForm';

// Mock the tRPC hook
const mockMutateAsync = vi.fn();
vi.mock('../../../src/utils/trpc', () => ({
  trpc: {
    auth: {
      register: {
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

describe('RegisterForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form correctly', () => {
    render(<RegisterForm onSuccess={mockOnSuccess} onSwitchToLogin={mockOnSwitchToLogin} />);
    
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<RegisterForm onSuccess={mockOnSuccess} onSwitchToLogin={mockOnSwitchToLogin} />);
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(<RegisterForm onSuccess={mockOnSuccess} onSwitchToLogin={mockOnSwitchToLogin} />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    render(<RegisterForm onSuccess={mockOnSuccess} onSwitchToLogin={mockOnSwitchToLogin} />);
    
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    fireEvent.change(passwordInput, { target: { value: '1234567' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      user: { id: '1', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
      session: { access_token: 'token' },
      message: 'Registration successful',
    });

    render(<RegisterForm onSuccess={mockOnSuccess} onSwitchToLogin={mockOnSwitchToLogin} />);
    
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'password123',
        industry: '',
      });
    });
  });

  it('calls onSwitchToLogin when sign in link is clicked', () => {
    render(<RegisterForm onSuccess={mockOnSuccess} onSwitchToLogin={mockOnSwitchToLogin} />);
    
    const signInLink = screen.getByText('Already have an account? Sign in');
    fireEvent.click(signInLink);
    
    expect(mockOnSwitchToLogin).toHaveBeenCalled();
  });
});
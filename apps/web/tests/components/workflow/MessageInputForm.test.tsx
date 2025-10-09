import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInputForm } from '../../../src/components/workflow/MessageInputForm';
import { MESSAGE_VALIDATION } from '@freelance-flow/shared';

// Mock the form submission
const mockOnSubmit = vi.fn();

describe('MessageInputForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with default values', () => {
    render(<MessageInputForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/client message/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/urgency level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate responses/i })).toBeInTheDocument();
  });

  it('shows character count and validation', async () => {
    render(<MessageInputForm onSubmit={mockOnSubmit} />);

    const textarea = screen.getByLabelText(/client message/i);
    const shortMessage = 'Short';

    await user.type(textarea, shortMessage);

    expect(screen.getByText(`${shortMessage.length}/${MESSAGE_VALIDATION.maxLength}`)).toBeInTheDocument();
    expect(screen.getByText(/minimum.*characters required/i)).toBeInTheDocument();
  });

  it('validates minimum character length', async () => {
    render(<MessageInputForm onSubmit={mockOnSubmit} />);

    const textarea = screen.getByLabelText(/client message/i);
    const submitButton = screen.getByRole('button', { name: /generate responses/i });

    // Type less than minimum required characters
    await user.type(textarea, 'Short');

    // Button should be disabled
    expect(submitButton).toBeDisabled();
  });

  it('validates maximum character length', async () => {
    render(<MessageInputForm onSubmit={mockOnSubmit} />);

    const textarea = screen.getByLabelText(/client message/i);

    // Type more than maximum allowed characters
    const longMessage = 'a'.repeat(MESSAGE_VALIDATION.maxLength + 100);
    await user.type(textarea, longMessage);

    await waitFor(() => {
      expect(screen.getByText(/cannot exceed.*characters/i)).toBeInTheDocument();
    });
  });

  it('submits valid form with correct data', async () => {
    const validMessage = 'This is a valid client message that meets the minimum character requirement for form submission.';

    render(<MessageInputForm onSubmit={mockOnSubmit} />);

    const textarea = screen.getByLabelText(/client message/i);
    const urgencySelect = screen.getByLabelText(/urgency level/i);
    const messageTypeSelect = screen.getByLabelText(/message type/i);
    const submitButton = screen.getByRole('button', { name: /generate responses/i });

    // Fill out the form
    await user.type(textarea, validMessage);
    await user.selectOptions(urgencySelect, 'immediate');
    await user.selectOptions(messageTypeSelect, 'concern');

    // Submit the form
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        originalMessage: validMessage,
        context: {
          urgency: 'immediate',
          messageType: 'concern',
          relationshipStage: 'established',
          projectPhase: 'active',
        },
      });
    });
  });

  it('shows loading state when isLoading is true', () => {
    render(<MessageInputForm onSubmit={mockOnSubmit} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: /generating/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByLabelText(/client message/i)).toBeDisabled();
  });

  it('populates form with default values', () => {
    const defaultValues = {
      originalMessage: 'Pre-filled message content for testing form population',
      context: {
        urgency: 'immediate' as const,
        messageType: 'payment' as const,
        relationshipStage: 'new' as const,
        projectPhase: 'completion' as const,
      },
    };

    render(
      <MessageInputForm onSubmit={mockOnSubmit} defaultValues={defaultValues} />
    );

    expect(screen.getByDisplayValue(defaultValues.originalMessage)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Immediate - Urgent response needed')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Payment - Invoice or billing related')).toBeInTheDocument();
  });

  it('updates character count in real time', async () => {
    render(<MessageInputForm onSubmit={mockOnSubmit} />);

    const textarea = screen.getByLabelText(/client message/i);
    const message = 'Testing character count functionality';

    await user.type(textarea, message);

    expect(screen.getByText(`${message.length}/${MESSAGE_VALIDATION.maxLength}`)).toBeInTheDocument();
  });

  it('shows different character count colors based on length', async () => {
    render(<MessageInputForm onSubmit={mockOnSubmit} />);

    const textarea = screen.getByLabelText(/client message/i);

    // Test short message (should be red due to minimum requirement)
    await user.type(textarea, 'Short');
    const shortCountElement = screen.getByText(`5/${MESSAGE_VALIDATION.maxLength}`);
    expect(shortCountElement).toHaveClass('text-red-500');

    // Clear and test longer message
    await user.clear(textarea);
    const longMessage = 'This is a sufficiently long message that meets the minimum character requirements for the form validation.';
    await user.type(textarea, longMessage);
    const longCountElement = screen.getByText(`${longMessage.length}/${MESSAGE_VALIDATION.maxLength}`);
    expect(longCountElement).toHaveClass('text-gray-500');
  });
});
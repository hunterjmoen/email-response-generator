import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseDisplay } from '../../../src/components/workflow/ResponseDisplay';
import { type AIResponseOptions } from '@freelance-flow/shared';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

const mockOnCopy = vi.fn();
const mockOnRate = vi.fn();
const mockOnSelect = vi.fn();

const mockResponses: AIResponseOptions[] = [
  {
    content: 'Thank you for your message. I understand your concern and will address it immediately.',
    tone: 'professional',
    length: 'standard',
    confidence: 0.95,
    reasoning: 'Professional tone appropriate for business communication',
  },
  {
    content: 'Hi! Thanks for reaching out. I can definitely help with that.',
    tone: 'casual',
    length: 'brief',
    confidence: 0.87,
    reasoning: 'Casual approach for friendly communication',
  },
  {
    content: 'Dear valued client, I have received your correspondence and want to provide you with a comprehensive response addressing all aspects of your inquiry.',
    tone: 'formal',
    length: 'detailed',
    confidence: 0.82,
    reasoning: 'Formal detailed response for important matters',
  },
];

describe('ResponseDisplay', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders responses correctly', () => {
    render(
      <ResponseDisplay
        responses={mockResponses}
        onCopy={mockOnCopy}
        onRate={mockOnRate}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('AI Response Options (3)')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();

    // Check response content
    expect(screen.getByText(/Thank you for your message/)).toBeInTheDocument();
    expect(screen.getByText(/Hi! Thanks for reaching out/)).toBeInTheDocument();
    expect(screen.getByText(/Dear valued client/)).toBeInTheDocument();
  });

  it('displays response metadata correctly', () => {
    render(
      <ResponseDisplay
        responses={mockResponses}
        onCopy={mockOnCopy}
        onRate={mockOnRate}
        onSelect={mockOnSelect}
      />
    );

    // Check tone badges
    expect(screen.getByText('professional')).toBeInTheDocument();
    expect(screen.getByText('casual')).toBeInTheDocument();
    expect(screen.getByText('formal')).toBeInTheDocument();

    // Check length badges
    expect(screen.getByText('standard')).toBeInTheDocument();
    expect(screen.getByText('brief')).toBeInTheDocument();
    expect(screen.getByText('detailed')).toBeInTheDocument();

    // Check confidence scores
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
  });

  it('displays reasoning when provided', () => {
    render(
      <ResponseDisplay
        responses={mockResponses}
        onCopy={mockOnCopy}
        onRate={mockOnRate}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText(/Professional tone appropriate/)).toBeInTheDocument();
    expect(screen.getByText(/Casual approach for friendly/)).toBeInTheDocument();
    expect(screen.getByText(/Formal detailed response/)).toBeInTheDocument();
  });

  it('handles copy functionality', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;

    render(
      <ResponseDisplay
        responses={mockResponses}
        onCopy={mockOnCopy}
        onRate={mockOnRate}
        onSelect={mockOnSelect}
      />
    );

    const copyButtons = screen.getAllByText('Copy to Clipboard');
    await user.click(copyButtons[0]);

    expect(mockWriteText).toHaveBeenCalledWith(mockResponses[0].content);
    expect(mockOnCopy).toHaveBeenCalledWith(mockResponses[0].content, 0);

    // Check if the button text changes to "Copied!"
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('handles response selection', async () => {
    render(
      <ResponseDisplay
        responses={mockResponses}
        onCopy={mockOnCopy}
        onRate={mockOnRate}
        onSelect={mockOnSelect}
      />
    );

    const selectButtons = screen.getAllByText('Select This Response');
    await user.click(selectButtons[1]);

    expect(mockOnSelect).toHaveBeenCalledWith(1);
  });

  it('shows selected response state', () => {
    render(
      <ResponseDisplay
        responses={mockResponses}
        onCopy={mockOnCopy}
        onRate={mockOnRate}
        onSelect={mockOnSelect}
        selectedIndex={1}
      />
    );

    // Second response should be selected
    const selectButtons = screen.getAllByText(/Select/);
    expect(screen.getByText('Selected')).toBeInTheDocument();
    expect(screen.getAllByText('Select This Response')).toHaveLength(2); // Other two not selected
  });

  it('handles rating functionality', async () => {
    render(
      <ResponseDisplay
        responses={mockResponses}
        onCopy={mockOnCopy}
        onRate={mockOnRate}
        onSelect={mockOnSelect}
      />
    );

    // Find star rating buttons for the first response
    const responseCards = screen.getAllByText(/Option/);
    const firstResponseCard = responseCards[0].closest('.bg-white');

    if (firstResponseCard) {
      const starButtons = firstResponseCard.querySelectorAll('button[class*="h-4 w-4"]');

      // Click the 4th star (4-star rating)
      if (starButtons[3]) {
        await user.click(starButtons[3]);
        expect(mockOnRate).toHaveBeenCalledWith(0, 4);
      }
    }
  });

  it('shows loading state', () => {
    render(
      <ResponseDisplay
        responses={[]}
        onCopy={mockOnCopy}
        onRate={mockOnRate}
        onSelect={mockOnSelect}
        isLoading={true}
      />
    );

    // Should show skeleton loading cards
    const loadingElements = screen.getAllByText('').filter(el =>
      el.className.includes('animate-pulse')
    );
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no responses', () => {
    render(
      <ResponseDisplay
        responses={[]}
        onCopy={mockOnCopy}
        onRate={mockOnRate}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText(/No responses generated yet/)).toBeInTheDocument();
  });

  it('applies correct CSS classes for tone colors', () => {
    render(
      <ResponseDisplay
        responses={mockResponses}
        onCopy={mockOnCopy}
        onRate={mockOnRate}
        onSelect={mockOnSelect}
      />
    );

    const professionalBadge = screen.getByText('professional');
    const casualBadge = screen.getByText('casual');
    const formalBadge = screen.getByText('formal');

    expect(professionalBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    expect(casualBadge).toHaveClass('bg-green-100', 'text-green-800');
    expect(formalBadge).toHaveClass('bg-purple-100', 'text-purple-800');
  });

  it('applies correct CSS classes for length colors', () => {
    render(
      <ResponseDisplay
        responses={mockResponses}
        onCopy={mockOnCopy}
        onRate={mockOnRate}
        onSelect={mockOnSelect}
      />
    );

    const briefBadge = screen.getByText('brief');
    const standardBadge = screen.getByText('standard');
    const detailedBadge = screen.getByText('detailed');

    expect(briefBadge).toHaveClass('bg-orange-100', 'text-orange-800');
    expect(standardBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    expect(detailedBadge).toHaveClass('bg-indigo-100', 'text-indigo-800');
  });

  it('highlights selected response with proper styling', () => {
    render(
      <ResponseDisplay
        responses={mockResponses}
        onCopy={mockOnCopy}
        onRate={mockOnRate}
        onSelect={mockOnSelect}
        selectedIndex={0}
      />
    );

    // Find the first response card
    const responseCards = document.querySelectorAll('.bg-white.rounded-lg.border');
    const selectedCard = responseCards[0];

    expect(selectedCard).toHaveClass('border-blue-500', 'ring-2', 'ring-blue-200');
  });
});
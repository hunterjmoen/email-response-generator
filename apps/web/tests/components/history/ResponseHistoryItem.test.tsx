import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResponseHistoryItem } from '../../../src/components/history/ResponseHistoryItem';
import type { HistorySearchResult } from '@freelance-flow/shared';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

const mockHistoryItem: HistorySearchResult = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  originalMessage: 'Need to send project update to client about the latest milestone completion.',
  context: {
    urgency: 'standard',
    messageType: 'update',
    relationshipStage: 'established',
    projectPhase: 'active'
  },
  generatedOptions: [
    {
      content: 'Hi John, I wanted to update you on the project progress. We have successfully completed the latest milestone.',
      tone: 'professional',
      length: 'standard',
      confidence: 0.85
    },
    {
      content: 'Hey John! Quick update - we just finished the milestone!',
      tone: 'casual',
      length: 'brief',
      confidence: 0.78
    }
  ],
  selectedResponse: 0,
  userRating: 4,
  createdAt: '2024-01-15T10:00:00Z',
};

describe('ResponseHistoryItem', () => {
  const mockHandlers = {
    onCopy: vi.fn(),
    onDelete: vi.fn(),
    onView: vi.fn(),
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders history item with all required information', () => {
    render(
      <ResponseHistoryItem
        item={mockHistoryItem}
        {...mockHandlers}
      />
    );

    // Check date formatting
    expect(screen.getByText(/Jan 15/)).toBeInTheDocument();

    // Check context badges
    expect(screen.getByText('standard')).toBeInTheDocument();
    expect(screen.getByText('update')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();

    // Check original message
    expect(screen.getByText(/Need to send project update to client/)).toBeInTheDocument();

    // Check selected response preview
    expect(screen.getByText('Selected Response:')).toBeInTheDocument();
    expect(screen.getByText(/Hi John, I wanted to update you/)).toBeInTheDocument();

    // Check rating stars
    expect(screen.getAllByRole('img', { hidden: true })).toHaveLength(5); // 5 star icons

    // Check action buttons
    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('displays context badges with correct colors', () => {
    render(
      <ResponseHistoryItem
        item={{
          ...mockHistoryItem,
          context: {
            urgency: 'immediate',
            messageType: 'payment',
            relationshipStage: 'difficult',
            projectPhase: 'completion'
          }
        }}
        {...mockHandlers}
      />
    );

    // Urgency badges should have different colors
    const urgencyBadge = screen.getByText('immediate');
    expect(urgencyBadge).toHaveClass('bg-red-100', 'text-red-800');

    const messageTypeBadge = screen.getByText('payment');
    expect(messageTypeBadge).toHaveClass('bg-purple-100', 'text-purple-800');
  });

  it('truncates long original messages', () => {
    const longMessage = 'This is a very long message that should be truncated to ensure the UI remains clean and readable without taking up too much space in the list view.';

    render(
      <ResponseHistoryItem
        item={{
          ...mockHistoryItem,
          originalMessage: longMessage
        }}
        {...mockHandlers}
      />
    );

    // Should show truncated text with "Show more" button
    expect(screen.getByText('Show more')).toBeInTheDocument();
    expect(screen.getByText(/This is a very long message/)).toBeInTheDocument();
  });

  it('expands message when "Show more" is clicked', async () => {
    const longMessage = 'This is a very long message that should be truncated to ensure the UI remains clean and readable without taking up too much space in the list view.';

    render(
      <ResponseHistoryItem
        item={{
          ...mockHistoryItem,
          originalMessage: longMessage
        }}
        {...mockHandlers}
      />
    );

    const showMoreButton = screen.getByText('Show more');
    fireEvent.click(showMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Show less')).toBeInTheDocument();
    });

    // Should show full message
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it('handles copy functionality', async () => {
    render(
      <ResponseHistoryItem
        item={mockHistoryItem}
        {...mockHandlers}
      />
    );

    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'Hi John, I wanted to update you on the project progress. We have successfully completed the latest milestone.'
      );
    });

    expect(mockHandlers.onCopy).toHaveBeenCalledWith(
      'Hi John, I wanted to update you on the project progress. We have successfully completed the latest milestone.'
    );

    // Should show "Copied!" feedback
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('handles copy when no selected response', async () => {
    render(
      <ResponseHistoryItem
        item={{
          ...mockHistoryItem,
          selectedResponse: undefined
        }}
        {...mockHandlers}
      />
    );

    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);

    // Should copy first option when no selected response
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'Hi John, I wanted to update you on the project progress. We have successfully completed the latest milestone.'
      );
    });
  });

  it('handles selection checkbox', () => {
    render(
      <ResponseHistoryItem
        item={mockHistoryItem}
        isSelected={false}
        {...mockHandlers}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    expect(mockHandlers.onSelect).toHaveBeenCalledWith(mockHistoryItem.id, true);
  });

  it('shows selected state when isSelected is true', () => {
    render(
      <ResponseHistoryItem
        item={mockHistoryItem}
        isSelected={true}
        {...mockHandlers}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    // Container should have selected styling
    const container = checkbox.closest('div');
    expect(container).toHaveClass('border-blue-500', 'ring-2', 'ring-blue-200');
  });

  it('handles view details button', () => {
    render(
      <ResponseHistoryItem
        item={mockHistoryItem}
        {...mockHandlers}
      />
    );

    const viewButton = screen.getByText('View Details');
    fireEvent.click(viewButton);

    expect(mockHandlers.onView).toHaveBeenCalledWith(mockHistoryItem.id);
  });

  it('handles delete button', () => {
    render(
      <ResponseHistoryItem
        item={mockHistoryItem}
        {...mockHandlers}
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockHistoryItem.id);
  });

  it('hides actions when showActions is false', () => {
    render(
      <ResponseHistoryItem
        item={mockHistoryItem}
        showActions={false}
        {...mockHandlers}
      />
    );

    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
    expect(screen.queryByText('Copy')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('displays search snippet when provided', () => {
    const itemWithSnippet = {
      ...mockHistoryItem,
      snippet: '...send <mark class="bg-yellow-200">project</mark> update to client...'
    };

    render(
      <ResponseHistoryItem
        item={itemWithSnippet}
        {...mockHandlers}
      />
    );

    // Should render HTML snippet (checking for presence of snippet content)
    expect(screen.getByText(/send.*update to client/)).toBeInTheDocument();
  });

  it('displays correct number of response options', () => {
    render(
      <ResponseHistoryItem
        item={mockHistoryItem}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('2 options')).toBeInTheDocument();
  });

  it('displays singular "option" when only one response', () => {
    render(
      <ResponseHistoryItem
        item={{
          ...mockHistoryItem,
          generatedOptions: [mockHistoryItem.generatedOptions[0]]
        }}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('1 option')).toBeInTheDocument();
  });

  it('handles empty generated options gracefully', () => {
    render(
      <ResponseHistoryItem
        item={{
          ...mockHistoryItem,
          generatedOptions: [],
          selectedResponse: undefined
        }}
        {...mockHandlers}
      />
    );

    const copyButton = screen.getByText('Copy');
    expect(copyButton).toBeDisabled();
    expect(screen.getByText('0 options')).toBeInTheDocument();
  });
});
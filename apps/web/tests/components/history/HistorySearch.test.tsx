import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HistorySearch } from '../../../src/components/history/HistorySearch';
import type { HistorySearchFilters } from '@freelance-flow/shared';

describe('HistorySearch', () => {
  const mockHandlers = {
    onSearch: vi.fn(),
    onClear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input and filter button', () => {
    render(
      <HistorySearch {...mockHandlers} />
    );

    expect(screen.getByPlaceholderText('Search your response history...')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('handles keyword search with debouncing', async () => {
    render(
      <HistorySearch {...mockHandlers} />
    );

    const searchInput = screen.getByPlaceholderText('Search your response history...');

    fireEvent.change(searchInput, { target: { value: 'project update' } });

    // Should debounce search calls
    await waitFor(() => {
      expect(mockHandlers.onSearch).toHaveBeenCalledWith({
        keywords: 'project update'
      });
    }, { timeout: 500 });
  });

  it('shows advanced filters when filter button is clicked', () => {
    render(
      <HistorySearch {...mockHandlers} />
    );

    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    // Should show date inputs
    expect(screen.getByLabelText(/From Date/)).toBeInTheDocument();
    expect(screen.getByLabelText(/To Date/)).toBeInTheDocument();

    // Should show context filters
    expect(screen.getByLabelText('Urgency')).toBeInTheDocument();
    expect(screen.getByLabelText('Message Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Relationship Stage')).toBeInTheDocument();
    expect(screen.getByLabelText('Project Phase')).toBeInTheDocument();
  });

  it('handles date filter changes', async () => {
    render(
      <HistorySearch {...mockHandlers} />
    );

    // Open advanced filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    const fromDateInput = screen.getByLabelText(/From Date/);
    fireEvent.change(fromDateInput, { target: { value: '2024-01-01' } });

    await waitFor(() => {
      expect(mockHandlers.onSearch).toHaveBeenCalledWith({
        dateFrom: '2024-01-01T00:00:00.000Z'
      });
    });
  });

  it('handles context filter changes', async () => {
    render(
      <HistorySearch {...mockHandlers} />
    );

    // Open advanced filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    const urgencySelect = screen.getByLabelText('Urgency');
    fireEvent.change(urgencySelect, { target: { value: 'immediate' } });

    await waitFor(() => {
      expect(mockHandlers.onSearch).toHaveBeenCalledWith({
        context: {
          urgency: 'immediate'
        }
      });
    });
  });

  it('combines multiple context filters', async () => {
    render(
      <HistorySearch {...mockHandlers} />
    );

    // Open advanced filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    // Set multiple context filters
    const urgencySelect = screen.getByLabelText('Urgency');
    const messageTypeSelect = screen.getByLabelText('Message Type');

    fireEvent.change(urgencySelect, { target: { value: 'immediate' } });

    await waitFor(() => {
      expect(mockHandlers.onSearch).toHaveBeenCalledWith({
        context: {
          urgency: 'immediate'
        }
      });
    });

    fireEvent.change(messageTypeSelect, { target: { value: 'payment' } });

    await waitFor(() => {
      expect(mockHandlers.onSearch).toHaveBeenCalledWith({
        context: {
          urgency: 'immediate',
          messageType: 'payment'
        }
      });
    });
  });

  it('shows filter count badge when filters are active', () => {
    const initialFilters: HistorySearchFilters = {
      keywords: 'test',
      dateFrom: '2024-01-01T00:00:00.000Z',
      context: {
        urgency: 'immediate',
        messageType: 'payment'
      }
    };

    render(
      <HistorySearch
        {...mockHandlers}
        initialFilters={initialFilters}
      />
    );

    // Should show filter count (keywords + dateFrom + 2 context filters = 4)
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows clear button when filters are active', () => {
    const initialFilters: HistorySearchFilters = {
      keywords: 'test',
    };

    render(
      <HistorySearch
        {...mockHandlers}
        initialFilters={initialFilters}
      />
    );

    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('handles clear all filters', () => {
    const initialFilters: HistorySearchFilters = {
      keywords: 'test',
      dateFrom: '2024-01-01T00:00:00.000Z',
    };

    render(
      <HistorySearch
        {...mockHandlers}
        initialFilters={initialFilters}
      />
    );

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    expect(mockHandlers.onClear).toHaveBeenCalled();
  });

  it('removes context filter when set to empty value', async () => {
    render(
      <HistorySearch {...mockHandlers} />
    );

    // Open advanced filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    // Set then clear a context filter
    const urgencySelect = screen.getByLabelText('Urgency');

    fireEvent.change(urgencySelect, { target: { value: 'immediate' } });
    await waitFor(() => {
      expect(mockHandlers.onSearch).toHaveBeenCalledWith({
        context: { urgency: 'immediate' }
      });
    });

    fireEvent.change(urgencySelect, { target: { value: '' } });
    await waitFor(() => {
      expect(mockHandlers.onSearch).toHaveBeenCalledWith({});
    });
  });

  it('disables inputs when loading', () => {
    render(
      <HistorySearch
        {...mockHandlers}
        isLoading={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search your response history...');
    expect(searchInput).toBeDisabled();
  });

  it('initializes with provided filters', () => {
    const initialFilters: HistorySearchFilters = {
      keywords: 'initial search',
      dateFrom: '2024-01-01T00:00:00.000Z',
      dateTo: '2024-01-31T23:59:59.999Z',
      context: {
        urgency: 'immediate',
        messageType: 'update'
      }
    };

    render(
      <HistorySearch
        {...mockHandlers}
        initialFilters={initialFilters}
      />
    );

    // Search input should have initial value
    const searchInput = screen.getByDisplayValue('initial search');
    expect(searchInput).toBeInTheDocument();

    // Open filters to check date values
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    const fromDateInput = screen.getByLabelText(/From Date/) as HTMLInputElement;
    const toDateInput = screen.getByLabelText(/To Date/) as HTMLInputElement;

    expect(fromDateInput.value).toBe('2024-01-01');
    expect(toDateInput.value).toBe('2024-01-31');

    // Check context selects
    const urgencySelect = screen.getByLabelText('Urgency') as HTMLSelectElement;
    const messageTypeSelect = screen.getByLabelText('Message Type') as HTMLSelectElement;

    expect(urgencySelect.value).toBe('immediate');
    expect(messageTypeSelect.value).toBe('update');
  });

  it('handles all urgency options', async () => {
    render(
      <HistorySearch {...mockHandlers} />
    );

    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    const urgencySelect = screen.getByLabelText('Urgency');

    // Test all urgency options
    const urgencyOptions = ['immediate', 'standard', 'non_urgent'];

    for (const option of urgencyOptions) {
      fireEvent.change(urgencySelect, { target: { value: option } });

      await waitFor(() => {
        expect(mockHandlers.onSearch).toHaveBeenCalledWith({
          context: { urgency: option }
        });
      });
    }
  });

  it('handles all message type options', async () => {
    render(
      <HistorySearch {...mockHandlers} />
    );

    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    const messageTypeSelect = screen.getByLabelText('Message Type');

    // Test all message type options
    const messageTypeOptions = ['update', 'question', 'concern', 'deliverable', 'payment', 'scope_change'];

    for (const option of messageTypeOptions) {
      fireEvent.change(messageTypeSelect, { target: { value: option } });

      await waitFor(() => {
        expect(mockHandlers.onSearch).toHaveBeenCalledWith({
          context: { messageType: option }
        });
      });
    }
  });

  it('toggles advanced filters visibility', () => {
    render(
      <HistorySearch {...mockHandlers} />
    );

    const filtersButton = screen.getByText('Filters');

    // Initially closed
    expect(screen.queryByLabelText(/From Date/)).not.toBeInTheDocument();

    // Open
    fireEvent.click(filtersButton);
    expect(screen.getByLabelText(/From Date/)).toBeInTheDocument();

    // Close
    fireEvent.click(filtersButton);
    expect(screen.queryByLabelText(/From Date/)).not.toBeInTheDocument();
  });
});
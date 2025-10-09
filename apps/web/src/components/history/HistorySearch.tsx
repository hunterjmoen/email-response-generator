import { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { type HistorySearchFilters } from '@freelance-flow/shared';

interface HistorySearchProps {
  onSearch: (filters: HistorySearchFilters) => void;
  onClear: () => void;
  initialFilters?: HistorySearchFilters;
  isLoading?: boolean;
}

export function HistorySearch({
  onSearch,
  onClear,
  initialFilters,
  isLoading = false,
}: HistorySearchProps) {
  const [filters, setFilters] = useState<HistorySearchFilters>(initialFilters || {});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Auto-search on keyword changes with debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (filters.keywords !== undefined) {
        onSearch(filters);
      }
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [filters.keywords]);

  const handleKeywordChange = (keywords: string) => {
    setFilters({ ...filters, keywords: keywords || undefined });
  };

  const handleDateFromChange = (dateFrom: string) => {
    setFilters({ ...filters, dateFrom: dateFrom || undefined });
    if (dateFrom) onSearch({ ...filters, dateFrom });
  };

  const handleDateToChange = (dateTo: string) => {
    setFilters({ ...filters, dateTo: dateTo || undefined });
    if (dateTo) onSearch({ ...filters, dateTo });
  };

  const handleContextChange = (field: string, value: string) => {
    const newContext = {
      ...filters.context,
      [field]: value || undefined,
    };

    // Remove undefined values
    Object.keys(newContext).forEach(key => {
      if (newContext[key as keyof typeof newContext] === undefined) {
        delete newContext[key as keyof typeof newContext];
      }
    });

    const newFilters = {
      ...filters,
      context: Object.keys(newContext).length > 0 ? newContext : undefined,
    };

    setFilters(newFilters);
    onSearch(newFilters);
  };

  const handleClearAll = () => {
    setFilters({});
    setShowAdvanced(false);
    onClear();
  };

  const hasActiveFilters = () => {
    return !!(
      filters.keywords ||
      filters.dateFrom ||
      filters.dateTo ||
      (filters.context && Object.keys(filters.context).length > 0)
    );
  };

  const getFilterCount = () => {
    let count = 0;
    if (filters.keywords) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.context) {
      count += Object.keys(filters.context).length;
    }
    return count;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      {/* Main search bar */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search your response history..."
            value={filters.keywords || ''}
            onChange={(e) => handleKeywordChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            showAdvanced || hasActiveFilters()
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FunnelIcon className="h-4 w-4" />
          <span>Filters</span>
          {getFilterCount() > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
              {getFilterCount()}
            </span>
          )}
        </button>

        {hasActiveFilters() && (
          <button
            onClick={handleClearAll}
            className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-4 w-4" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="border-t border-gray-100 pt-4 space-y-4">
          {/* Date filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="inline h-4 w-4 mr-1" />
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom?.split('T')[0] || ''}
                onChange={(e) => handleDateFromChange(e.target.value ? `${e.target.value}T00:00:00.000Z` : '')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="inline h-4 w-4 mr-1" />
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo?.split('T')[0] || ''}
                onChange={(e) => handleDateToChange(e.target.value ? `${e.target.value}T23:59:59.999Z` : '')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Context filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Urgency
              </label>
              <select
                value={filters.context?.urgency || ''}
                onChange={(e) => handleContextChange('urgency', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="immediate">Immediate</option>
                <option value="standard">Standard</option>
                <option value="non_urgent">Non-urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Type
              </label>
              <select
                value={filters.context?.messageType || ''}
                onChange={(e) => handleContextChange('messageType', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="update">Update</option>
                <option value="question">Question</option>
                <option value="concern">Concern</option>
                <option value="deliverable">Deliverable</option>
                <option value="payment">Payment</option>
                <option value="scope_change">Scope Change</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relationship Stage
              </label>
              <select
                value={filters.context?.relationshipStage || ''}
                onChange={(e) => handleContextChange('relationshipStage', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="new">New</option>
                <option value="established">Established</option>
                <option value="difficult">Difficult</option>
                <option value="long_term">Long-term</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Phase
              </label>
              <select
                value={filters.context?.projectPhase || ''}
                onChange={(e) => handleContextChange('projectPhase', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="discovery">Discovery</option>
                <option value="active">Active</option>
                <option value="completion">Completion</option>
                <option value="maintenance">Maintenance</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
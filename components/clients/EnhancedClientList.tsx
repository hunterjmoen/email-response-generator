import { useState, useMemo, useEffect, useCallback } from 'react';
import { Client } from '@freelance-flow/shared';
import Link from 'next/link';
import { Avatar } from '../shared/Avatar';
import { DropdownMenu } from '../shared/DropdownMenu';
import { getRelationshipStageLabel, getRelationshipStageColor, type RelationshipStage } from '../../utils/clientLabels';
import { ClientStats } from './ClientStats';
import { ClientFilters, type ClientFilterOptions } from './ClientFilters';
import { BulkActionsToolbar } from './BulkActionsToolbar';

interface EnhancedClientListProps {
  clients: Client[];
  onEdit: (clientId: string) => void;
  onDelete: (clientId: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkUpdateStage: (ids: string[], stage: RelationshipStage) => void;
  onBulkUpdateTags: (ids: string[], tags: string[], mode: 'add' | 'remove') => void;
  allTags: string[];
}

type SortColumn = 'name' | 'company' | 'projects' | 'email' | 'relationshipStage' | 'priority' | 'healthScore';
type SortDirection = 'asc' | 'desc';

interface SortableHeaderProps {
  column: SortColumn;
  currentSort: SortColumn;
  direction: SortDirection;
  onClick: (column: SortColumn) => void;
  children: React.ReactNode;
}

function SortableHeader({ column, currentSort, direction, onClick, children }: SortableHeaderProps) {
  const isActive = currentSort === column;

  return (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
      onClick={() => onClick(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className="flex flex-col">
          <svg
            className={`w-3 h-3 ${isActive && direction === 'asc' ? 'text-green-600' : 'text-gray-400'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" transform="rotate(180 10 10)" />
          </svg>
          <svg
            className={`w-3 h-3 -mt-1 ${isActive && direction === 'desc' ? 'text-green-600' : 'text-gray-400'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </span>
      </div>
    </th>
  );
}

const defaultFilters: ClientFilterOptions = {
  stages: [],
  tags: [],
  priority: [],
  projectCount: 'all',
  dateAdded: 'all',
  missingData: [],
};

export function EnhancedClientList({
  clients,
  onEdit,
  onDelete,
  onBulkDelete,
  onBulkUpdateStage,
  onBulkUpdateTags,
  allTags,
}: EnhancedClientListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ClientFilterOptions>(defaultFilters);
  const [showArchived, setShowArchived] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + A to select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        const allIds = new Set(filteredAndSortedClients.map(c => c.id));
        setSelectedIds(allIds);
      }
      // Escape to deselect all
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clients]);

  // Handle column header click for sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.stages.length > 0 ||
      filters.tags.length > 0 ||
      filters.priority.length > 0 ||
      filters.projectCount !== 'all' ||
      filters.dateAdded !== 'all' ||
      filters.missingData.length > 0
    );
  }, [filters]);

  // Apply filters
  const applyFilters = useCallback((client: Client) => {
    // Relationship stage filter
    if (filters.stages.length > 0 && !filters.stages.includes(client.relationshipStage as RelationshipStage)) {
      return false;
    }

    // Tags filter
    if (filters.tags.length > 0) {
      const clientTags = client.tags || [];
      if (!filters.tags.some(tag => clientTags.includes(tag))) {
        return false;
      }
    }

    // Priority filter
    if (filters.priority.length > 0 && !filters.priority.includes(client.priority || 'medium')) {
      return false;
    }

    // Project count filter
    const projectCount = client.projectCount || 0;
    if (filters.projectCount !== 'all') {
      switch (filters.projectCount) {
        case '0':
          if (projectCount !== 0) return false;
          break;
        case '1-3':
          if (projectCount < 1 || projectCount > 3) return false;
          break;
        case '4-10':
          if (projectCount < 4 || projectCount > 10) return false;
          break;
        case '10+':
          if (projectCount < 10) return false;
          break;
      }
    }

    // Date added filter
    if (filters.dateAdded !== 'all') {
      const now = new Date();
      const createdAt = new Date(client.createdAt);
      const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      switch (filters.dateAdded) {
        case '7days':
          if (daysDiff > 7) return false;
          break;
        case '30days':
          if (daysDiff > 30) return false;
          break;
        case '90days':
          if (daysDiff > 90) return false;
          break;
      }
    }

    // Missing data filter
    if (filters.missingData.length > 0) {
      for (const field of filters.missingData) {
        if (client[field]) return false;
      }
    }

    // Archive filter
    if (!showArchived && client.isArchived) {
      return false;
    }

    return true;
  }, [filters, showArchived]);

  // Filter, search, and sort clients
  const filteredAndSortedClients = useMemo(() => {
    let result = clients;

    // Apply filters
    result = result.filter(applyFilters);

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(client =>
        client.name.toLowerCase().includes(query) ||
        client.company?.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        (client.tags || []).some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    return [...result].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'company':
          aValue = (a.company || '').toLowerCase();
          bValue = (b.company || '').toLowerCase();
          break;
        case 'projects':
          aValue = a.projectCount ?? 0;
          bValue = b.projectCount ?? 0;
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'relationshipStage':
          aValue = a.relationshipStage;
          bValue = b.relationshipStage;
          break;
        case 'priority':
          const priorityMap = { low: 1, medium: 2, high: 3 };
          aValue = priorityMap[a.priority || 'medium'];
          bValue = priorityMap[b.priority || 'medium'];
          break;
        case 'healthScore':
          aValue = a.healthScore ?? 50;
          bValue = b.healthScore ?? 50;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clients, searchQuery, sortColumn, sortDirection, applyFilters]);

  // Select/deselect handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedClients.map(c => c.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Bulk action handlers
  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedIds.size} client(s)? This will also delete all associated projects.`)) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkUpdateStage = (stage: RelationshipStage) => {
    onBulkUpdateStage(Array.from(selectedIds), stage);
    setSelectedIds(new Set());
  };

  const handleBulkAddTags = (tags: string[]) => {
    onBulkUpdateTags(Array.from(selectedIds), tags, 'add');
  };

  const handleBulkRemoveTags = (tags: string[]) => {
    onBulkUpdateTags(Array.from(selectedIds), tags, 'remove');
  };

  // Get priority badge color
  const getPriorityColor = (priority?: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  // Get health score color
  const getHealthScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (clients.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No clients yet</h3>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Get started by creating a new client.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Dashboard */}
      <ClientStats clients={clients.filter(c => !c.isArchived)} />

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedIds.size}
          onDelete={handleBulkDelete}
          onUpdateStage={handleBulkUpdateStage}
          onAddTags={handleBulkAddTags}
          onRemoveTags={handleBulkRemoveTags}
          onDeselectAll={() => setSelectedIds(new Set())}
          allTags={allTags}
        />
      )}

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search clients by name, company, email, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && filteredAndSortedClients.length > 0 && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Found {filteredAndSortedClients.length} {filteredAndSortedClients.length === 1 ? 'client' : 'clients'}
          </p>
        )}
        {searchQuery && filteredAndSortedClients.length === 0 && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            No clients found matching "{searchQuery}"
          </p>
        )}
      </div>

      {/* Advanced Filters */}
      <ClientFilters
        filters={filters}
        onFilterChange={setFilters}
        allTags={allTags}
        onClearFilters={() => setFilters(defaultFilters)}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Client Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredAndSortedClients.length && filteredAndSortedClients.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                />
              </th>
              <SortableHeader column="name" currentSort={sortColumn} direction={sortDirection} onClick={handleSort}>
                Name
              </SortableHeader>
              <SortableHeader column="company" currentSort={sortColumn} direction={sortDirection} onClick={handleSort}>
                Company
              </SortableHeader>
              <SortableHeader column="projects" currentSort={sortColumn} direction={sortDirection} onClick={handleSort}>
                Projects
              </SortableHeader>
              <SortableHeader column="healthScore" currentSort={sortColumn} direction={sortDirection} onClick={handleSort}>
                Health
              </SortableHeader>
              <SortableHeader column="priority" currentSort={sortColumn} direction={sortDirection} onClick={handleSort}>
                Priority
              </SortableHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tags
              </th>
              <SortableHeader column="relationshipStage" currentSort={sortColumn} direction={sortDirection} onClick={handleSort}>
                Stage
              </SortableHeader>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedClients.map((client) => (
              <tr
                key={client.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedIds.has(client.id) ? 'bg-green-50 dark:bg-green-900/10' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(client.id)}
                    onChange={() => handleSelectOne(client.id)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="flex items-center gap-3 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                  >
                    <Avatar name={client.name} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{client.name}</span>
                        {!client.email && !client.phone && (
                          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" title="Missing contact info">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      {client.email && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{client.email}</div>
                      )}
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                  {client.company || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {client.projectCount ?? 0}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          (client.healthScore ?? 50) >= 75
                            ? 'bg-green-500'
                            : (client.healthScore ?? 50) >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${client.healthScore ?? 50}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getHealthScoreColor(client.healthScore ?? 50)}`}>
                      {client.healthScore ?? 50}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getPriorityColor(client.priority)}`}>
                    {client.priority || 'medium'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {(client.tags || []).slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="inline-flex px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
                      >
                        {tag}
                      </span>
                    ))}
                    {(client.tags || []).length > 2 && (
                      <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        +{(client.tags || []).length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRelationshipStageColor(client.relationshipStage as RelationshipStage)}`}>
                    {getRelationshipStageLabel(client.relationshipStage as RelationshipStage)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end">
                    <DropdownMenu
                      items={[
                        {
                          label: 'View Details',
                          onClick: () => window.location.href = `/dashboard/clients/${client.id}`,
                          icon: (
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ),
                        },
                        {
                          label: 'Edit',
                          onClick: () => onEdit(client.id),
                          icon: (
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          ),
                        },
                        {
                          label: 'Delete',
                          onClick: () => onDelete(client.id),
                          variant: 'danger',
                          icon: (
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
                            </svg>
                          ),
                        },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Results summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
        Showing {filteredAndSortedClients.length} of {clients.filter(c => !c.isArchived).length} clients
        {hasActiveFilters && ' (filtered)'}
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Client } from '@freelance-flow/shared';
import Link from 'next/link';
import { Avatar } from '../shared/Avatar';
import { DropdownMenu } from '../shared/DropdownMenu';
import { getRelationshipStageLabel, getRelationshipStageColor, type RelationshipStage } from '../../utils/clientLabels';

interface ClientListProps {
  clients: Client[];
  onEdit: (clientId: string) => void;
  onDelete: (clientId: string) => void;
}

type SortColumn = 'name' | 'company' | 'projects' | 'email' | 'relationshipStage';
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
            className={`w-3 h-3 ${isActive && direction === 'asc' ? 'text-green-600 dark:text-green-500' : 'text-gray-400 dark:text-gray-500'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" transform="rotate(180 10 10)" />
          </svg>
          <svg
            className={`w-3 h-3 -mt-1 ${isActive && direction === 'desc' ? 'text-green-600 dark:text-green-500' : 'text-gray-400 dark:text-gray-500'}`}
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

export function ClientList({ clients, onEdit, onDelete }: ClientListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handle column header click for sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    // First filter
    let result = clients;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = clients.filter(client =>
        client.name.toLowerCase().includes(query) ||
        client.company?.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query)
      );
    }

    // Then sort
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
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clients, searchQuery, sortColumn, sortDirection]);

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
        <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No clients yet</h3>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Get started by creating a new client.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
            placeholder="Search clients by name, company, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && filteredAndSortedClients.length > 0 && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Found {filteredAndSortedClients.length} {filteredAndSortedClients.length === 1 ? 'client' : 'clients'}
          </p>
        )}
        {searchQuery && filteredAndSortedClients.length === 0 && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            No clients found matching "{searchQuery}"
          </p>
        )}
      </div>

      {/* Client Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <SortableHeader column="name" currentSort={sortColumn} direction={sortDirection} onClick={handleSort}>
              Name
            </SortableHeader>
            <SortableHeader column="company" currentSort={sortColumn} direction={sortDirection} onClick={handleSort}>
              Company
            </SortableHeader>
            <SortableHeader column="projects" currentSort={sortColumn} direction={sortDirection} onClick={handleSort}>
              Projects
            </SortableHeader>
            <SortableHeader column="email" currentSort={sortColumn} direction={sortDirection} onClick={handleSort}>
              Email
            </SortableHeader>
            <SortableHeader column="relationshipStage" currentSort={sortColumn} direction={sortDirection} onClick={handleSort}>
              Relationship Stage
            </SortableHeader>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {filteredAndSortedClients.map((client) => (
            <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-6 py-4 whitespace-nowrap">
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="flex items-center gap-3 text-sm font-medium text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400"
                >
                  <Avatar name={client.name} size="sm" />
                  <span>{client.name}</span>
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {client.company || '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                <span className="inline-flex items-center">
                  <svg className="w-4 h-4 mr-1.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {client.projectCount ?? 0}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {client.email || '—'}
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
    </div>
  );
}

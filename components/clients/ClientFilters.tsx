import { useState } from 'react';
import { Client } from '@freelance-flow/shared';
import { getRelationshipStageLabel, type RelationshipStage } from '../../utils/clientLabels';

export interface ClientFilterOptions {
  stages: RelationshipStage[];
  tags: string[];
  priority: ('low' | 'medium' | 'high')[];
  projectCount: 'all' | '0' | '1-3' | '4-10' | '10+';
  dateAdded: 'all' | '7days' | '30days' | '90days';
  missingData: ('email' | 'phone' | 'company')[];
}

interface ClientFiltersProps {
  filters: ClientFilterOptions;
  onFilterChange: (filters: ClientFilterOptions) => void;
  allTags: string[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function ClientFilters({
  filters,
  onFilterChange,
  allTags,
  onClearFilters,
  hasActiveFilters,
}: ClientFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleStage = (stage: RelationshipStage) => {
    const newStages = filters.stages.includes(stage)
      ? filters.stages.filter(s => s !== stage)
      : [...filters.stages, stage];
    onFilterChange({ ...filters, stages: newStages });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFilterChange({ ...filters, tags: newTags });
  };

  const togglePriority = (priority: 'low' | 'medium' | 'high') => {
    const newPriority = filters.priority.includes(priority)
      ? filters.priority.filter(p => p !== priority)
      : [...filters.priority, priority];
    onFilterChange({ ...filters, priority: newPriority });
  };

  const toggleMissingData = (field: 'email' | 'phone' | 'company') => {
    const newMissing = filters.missingData.includes(field)
      ? filters.missingData.filter(f => f !== field)
      : [...filters.missingData, field];
    onFilterChange({ ...filters, missingData: newMissing });
  };

  const stages: RelationshipStage[] = ['new', 'established', 'difficult', 'long_term'];
  const priorities = ['low', 'medium', 'high'] as const;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Advanced Filters
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs rounded-full">
              Active
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Filter Options */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Relationship Stage */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Relationship Stage
            </label>
            <div className="space-y-2">
              {stages.map(stage => (
                <label key={stage} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.stages.includes(stage)}
                    onChange={() => toggleStage(stage)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {getRelationshipStageLabel(stage)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <div className="space-y-2">
              {priorities.map(priority => (
                <label key={priority} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.priority.includes(priority)}
                    onChange={() => togglePriority(priority)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {priority}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Project Count */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Count
            </label>
            <select
              value={filters.projectCount}
              onChange={(e) => onFilterChange({ ...filters, projectCount: e.target.value as any })}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All</option>
              <option value="0">0 projects</option>
              <option value="1-3">1-3 projects</option>
              <option value="4-10">4-10 projects</option>
              <option value="10+">10+ projects</option>
            </select>
          </div>

          {/* Date Added */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Added
            </label>
            <select
              value={filters.dateAdded}
              onChange={(e) => onFilterChange({ ...filters, dateAdded: e.target.value as any })}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All time</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
            </select>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      filters.tags.includes(tag)
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-600 dark:border-green-500 text-green-800 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Missing Data */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Missing Data
            </label>
            <div className="space-y-2">
              {(['email', 'phone', 'company'] as const).map(field => (
                <label key={field} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.missingData.includes(field)}
                    onChange={() => toggleMissingData(field)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                    No {field}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && !isExpanded && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {filters.stages.map(stage => (
            <span
              key={stage}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs rounded-full"
            >
              {getRelationshipStageLabel(stage)}
              <button
                onClick={() => toggleStage(stage)}
                className="hover:text-blue-900 dark:hover:text-blue-300"
              >
                ×
              </button>
            </span>
          ))}
          {filters.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs rounded-full"
            >
              {tag}
              <button
                onClick={() => toggleTag(tag)}
                className="hover:text-green-900 dark:hover:text-green-300"
              >
                ×
              </button>
            </span>
          ))}
          {filters.priority.map(priority => (
            <span
              key={priority}
              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 text-xs rounded-full capitalize"
            >
              {priority}
              <button
                onClick={() => togglePriority(priority)}
                className="hover:text-purple-900 dark:hover:text-purple-300"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

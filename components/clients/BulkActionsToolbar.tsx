import { useState } from 'react';
import { getRelationshipStageLabel, type RelationshipStage } from '../../utils/clientLabels';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onDelete: () => void;
  onUpdateStage: (stage: RelationshipStage) => void;
  onAddTags: (tags: string[]) => void;
  onRemoveTags: (tags: string[]) => void;
  onDeselectAll: () => void;
  allTags: string[];
}

export function BulkActionsToolbar({
  selectedCount,
  onDelete,
  onUpdateStage,
  onAddTags,
  onRemoveTags,
  onDeselectAll,
  allTags,
}: BulkActionsToolbarProps) {
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const stages: RelationshipStage[] = ['new', 'established', 'difficult', 'long_term'];

  const handleAddTag = () => {
    if (tagInput.trim()) {
      onAddTags([tagInput.trim()]);
      setTagInput('');
      setShowTagMenu(false);
    }
  };

  return (
    <div className="bg-green-600 dark:bg-green-700 text-white rounded-lg shadow-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">
              {selectedCount} {selectedCount === 1 ? 'client' : 'clients'} selected
            </span>
          </div>

          <div className="h-6 w-px bg-green-400"></div>

          {/* Change Stage */}
          <div className="relative">
            <button
              onClick={() => setShowStageMenu(!showStageMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-500 dark:bg-green-600 hover:bg-green-400 dark:hover:bg-green-500 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Change Stage
            </button>
            {showStageMenu && (
              <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 min-w-[200px] z-10">
                {stages.map(stage => (
                  <button
                    key={stage}
                    onClick={() => {
                      onUpdateStage(stage);
                      setShowStageMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {getRelationshipStageLabel(stage)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manage Tags */}
          <div className="relative">
            <button
              onClick={() => setShowTagMenu(!showTagMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-500 dark:bg-green-600 hover:bg-green-400 dark:hover:bg-green-500 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Manage Tags
            </button>
            {showTagMenu && (
              <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 min-w-[300px] z-10">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Add New Tag
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder="Enter tag name"
                        className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        onClick={handleAddTag}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {allTags.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Add Existing Tags
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {allTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => {
                              onAddTags([tag]);
                              setShowTagMenu(false);
                            }}
                            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>

        {/* Deselect All */}
        <button
          onClick={onDeselectAll}
          className="flex items-center gap-2 text-white hover:text-green-100"
        >
          <span className="text-sm">Deselect All</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  TrashIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface HistoryActionsProps {
  selectedCount: number;
  onBulkDelete: (permanent?: boolean) => Promise<void>;
  onBulkExport: () => Promise<void>;
  onCancel: () => void;
}

export function HistoryActions({
  selectedCount,
  onBulkDelete,
  onBulkExport,
  onCancel,
}: HistoryActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async (permanent = false) => {
    setIsDeleting(true);
    try {
      await onBulkDelete(permanent);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onBulkExport();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {/* Bulk actions bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExport}
                disabled={isExporting || selectedCount === 0}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting || selectedCount === 0}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrashIcon className="h-4 w-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
          >
            <XMarkIcon className="h-4 w-4" />
            <span>Cancel</span>
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                  Delete Selected Items
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Are you sure you want to delete {selectedCount} selected item{selectedCount !== 1 ? 's' : ''}?
                  This action cannot be undone.
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                  <div className="text-sm text-yellow-800">
                    <strong>Note:</strong> Items will be soft-deleted (marked as deleted) by default.
                    You can choose permanent deletion if needed.
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => handleDelete(false)}
                  disabled={isDeleting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Soft Delete (Recommended)'}
                </button>

                <button
                  onClick={() => handleDelete(true)}
                  disabled={isDeleting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Permanent Delete'}
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
import { useState } from 'react';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { ClientList } from '../../components/clients/ClientList';
import { ClientForm } from '../../components/clients/ClientForm';
import { trpc } from '../../utils/trpc';
import toast from 'react-hot-toast';

export default function ClientsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<string | null>(null);

  const utils = trpc.useContext();
  const { data: clients, isLoading } = trpc.clients.list.useQuery();

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setIsFormOpen(false);
      toast.success('Client created successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create client');
    },
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setEditingClient(null);
      setIsFormOpen(false);
      toast.success('Client updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update client');
    },
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      toast.success('Client deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete client');
    },
  });

  const handleEdit = (clientId: string) => {
    setEditingClient(clientId);
    setIsFormOpen(true);
  };

  const handleDelete = async (clientId: string) => {
    if (confirm('Are you sure you want to delete this client? All associated projects will also be deleted.')) {
      await deleteMutation.mutateAsync({ id: clientId });
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingClient(null);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout title="Clients">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clients</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your client relationships and projects
              </p>
            </div>
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Client
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 dark:border-green-500"></div>
            </div>
          ) : (
            <ClientList
              clients={clients || []}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {isFormOpen && (
            <ClientForm
              clientId={editingClient}
              onClose={handleCloseForm}
              onSubmit={async (data) => {
                if (editingClient) {
                  await updateMutation.mutateAsync({ ...data, id: editingClient });
                } else {
                  await createMutation.mutateAsync(data);
                }
              }}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

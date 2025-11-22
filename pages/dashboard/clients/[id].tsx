import { useState } from 'react';
import { useRouter } from 'next/router';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { DashboardLayout } from '../../../components/layouts/DashboardLayout';
import { ClientForm } from '../../../components/clients/ClientForm';
import { ProjectList } from '../../../components/projects/ProjectList';
import { ProjectForm } from '../../../components/projects/ProjectForm';
import { Avatar } from '../../../components/shared/Avatar';
import { InfoCard } from '../../../components/shared/InfoCard';
import { StatsCard } from '../../../components/shared/StatsCard';
import { trpc } from '../../../utils/trpc';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { RELATIONSHIP_STAGE_LABELS, RELATIONSHIP_STAGE_COLORS } from '../../../utils/clientLabels';

export default function ClientDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const clientId = typeof id === 'string' ? id : '';

  const [isEditingClient, setIsEditingClient] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);

  const utils = trpc.useContext();
  const { data: client, isLoading: isLoadingClient } = trpc.clients.getById.useQuery(
    { id: clientId },
    { enabled: !!clientId }
  );
  const { data: projects, isLoading: isLoadingProjects } = trpc.projects.listByClient.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  const updateClientMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.getById.invalidate({ id: clientId });
      setIsEditingClient(false);
      toast.success('Client updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update client');
    },
  });

  const deleteClientMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      toast.success('Client deleted successfully');
      router.push('/dashboard/clients');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete client');
    },
  });

  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.listByClient.invalidate({ clientId });
      setIsAddingProject(false);
      toast.success('Project created successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create project');
    },
  });

  const updateProjectMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.listByClient.invalidate({ clientId });
      setEditingProject(null);
      toast.success('Project updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update project');
    },
  });

  const deleteProjectMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.listByClient.invalidate({ clientId });
      toast.success('Project deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete project');
    },
  });

  const handleDeleteClient = async () => {
    if (confirm('Are you sure you want to delete this client? All associated projects will also be deleted.')) {
      await deleteClientMutation.mutateAsync({ id: clientId });
    }
  };

  const handleEditProject = (projectId: string) => {
    setEditingProject(projectId);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProjectMutation.mutateAsync({ id: projectId });
    }
  };

  if (isLoadingClient) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Client Details">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!client) {
    return (
      <ProtectedRoute>
        <DashboardLayout title="Client Not Found">
          <div className="p-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Client Not Found</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">The client you're looking for doesn't exist.</p>
              <Link href="/dashboard/clients" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium">
                Return to Clients
              </Link>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const totalProjects = projects?.length || 0;
  const activeProjects = projects?.filter(p => p.status === 'active').length || 0;

  return (
    <ProtectedRoute>
      <DashboardLayout title={client.name}>
        <div className="p-6">
          <div className="mb-6">
            <Link href="/dashboard/clients" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium flex items-center gap-1 mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Clients
            </Link>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <StatsCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
                label="Total Projects"
                value={totalProjects}
                iconColor="text-green-600"
              />
              <StatsCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
                label="Active Projects"
                value={activeProjects}
                iconColor="text-blue-600"
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Avatar name={client.name} size="lg" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{client.name}</h2>
                    {client.company && <p className="text-gray-600 dark:text-gray-400 mt-1">{client.company}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingClient(true)}
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteClient}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {client.email && (
                  <InfoCard
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    }
                    label="Email"
                    value={client.email}
                    action={
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(client.email || '');
                          toast.success('Email copied to clipboard!');
                        }}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Copy email"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    }
                  />
                )}
                {client.phone && (
                  <InfoCard
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    }
                    label="Phone"
                    value={client.phone}
                    action={
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(client.phone || '');
                          toast.success('Phone copied to clipboard!');
                        }}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Copy phone"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    }
                  />
                )}
                {client.website && (
                  <InfoCard
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    }
                    label="Website"
                    value={
                      <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 underline">
                        {client.website}
                      </a>
                    }
                    action={
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(client.website || '');
                          toast.success('Website copied to clipboard!');
                        }}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Copy website"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    }
                  />
                )}
                <InfoCard
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  }
                  label="Relationship Stage"
                  value={
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${RELATIONSHIP_STAGE_COLORS[client.relationshipStage as keyof typeof RELATIONSHIP_STAGE_COLORS]}`}>
                      {RELATIONSHIP_STAGE_LABELS[client.relationshipStage as keyof typeof RELATIONSHIP_STAGE_LABELS]}
                    </span>
                  }
                />
              </div>

              {client.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                  <p className="text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Projects</h3>
              <button
                onClick={() => setIsAddingProject(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Project
              </button>
            </div>

            {isLoadingProjects ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <ProjectList
                projects={projects || []}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
              />
            )}
          </div>

          {isEditingClient && (
            <ClientForm
              clientId={clientId}
              onClose={() => setIsEditingClient(false)}
              onSubmit={async (data) => {
                await updateClientMutation.mutateAsync({ ...data, id: clientId });
              }}
            />
          )}

          {(isAddingProject || editingProject) && (
            <ProjectForm
              projectId={editingProject}
              clientId={clientId}
              onClose={() => {
                setIsAddingProject(false);
                setEditingProject(null);
              }}
              onSubmit={async (data) => {
                if (editingProject) {
                  await updateProjectMutation.mutateAsync({ ...data, id: editingProject });
                } else {
                  await createProjectMutation.mutateAsync(data);
                }
              }}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

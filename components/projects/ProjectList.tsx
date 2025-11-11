import { Project } from '@freelance-flow/shared';
import { format } from 'date-fns';

interface ProjectListProps {
  projects: Project[];
  onEdit: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

export function ProjectList({ projects, onEdit, onDelete }: ProjectListProps) {
  if (projects.length === 0) {
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No projects yet</h3>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Get started by creating a new project.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Budget
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Deadline
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {projects.map((project) => (
            <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</div>
                {project.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{project.description}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  project.status === 'discovery'
                    ? 'bg-blue-100 text-blue-800'
                    : project.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : project.status === 'completion'
                    ? 'bg-purple-100 text-purple-800'
                    : project.status === 'maintenance'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {project.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {project.budget ? `$${project.budget.toLocaleString()}` : '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                {project.deadline ? format(new Date(project.deadline), 'MMM d, yyyy') : '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onEdit(project.id)}
                  className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 mr-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(project.id)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

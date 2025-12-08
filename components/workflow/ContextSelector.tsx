import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { type ValidatedMessageInput, type ResponseContext } from '@freelance-flow/shared';
import { trpc } from '../../utils/trpc';
import { TonePrintBadge } from './TonePrintBadge';
import { type ToneFingerprint } from '../../services/tone-analysis';

interface SuggestedContext {
  urgency?: string;
  messageType?: string;
  sentiment?: string;
  confidence?: number;
}

interface ContextSelectorProps {
  onChange?: (context: ResponseContext) => void;
  suggestedContext?: SuggestedContext | null;
}

export function ContextSelector({ onChange, suggestedContext }: ContextSelectorProps) {
  const { register, watch, setValue } = useFormContext<ValidatedMessageInput>();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  const currentContext = watch('context');

  // Fetch clients and projects
  const { data: clientsData } = trpc.clients.list.useQuery();
  const { data: projectsData } = trpc.projects.listByClient.useQuery(
    { clientId: selectedClientId },
    { enabled: !!selectedClientId }
  );

  // Extract clients and projects from paginated response
  const clients = clientsData?.clients;
  const projects = projectsData?.projects;

  const handleFieldChange = (field: keyof ResponseContext, value: string) => {
    const newContext = { ...currentContext, [field]: value };
    setValue(`context.${field}`, value);
    onChange?.(newContext);
  };

  // Handle client selection
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectId(''); // Reset project when client changes

    // Store clientId in form for API submission
    setValue('clientId' as any, clientId || undefined);

    // Auto-populate relationship stage and client name from client
    const selectedClient = clients?.find((c) => c.id === clientId);
    if (selectedClient) {
      handleFieldChange('relationshipStage', selectedClient.relationshipStage);
      handleFieldChange('clientName', selectedClient.name);
    } else {
      // Clear client name if no client is selected
      handleFieldChange('clientName', '');
    }
  };

  // Handle project selection
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);

    // Auto-populate project phase from project
    const selectedProject = projects?.find((p) => p.id === projectId);
    if (selectedProject) {
      handleFieldChange('projectPhase', selectedProject.status);
    }
  };

  const urgencyOptions = [
    { value: 'immediate', label: 'Immediate - Urgent response needed' },
    { value: 'standard', label: 'Standard - Normal business timeline' },
    { value: 'non_urgent', label: 'Non-urgent - Can wait a few days' },
  ];

  // Removed formality options as it's not part of ResponseContext schema

  const messageTypeOptions = [
    { value: 'update', label: 'Update - Project status or progress' },
    { value: 'question', label: 'Question - Client inquiry or clarification' },
    { value: 'concern', label: 'Concern - Issue or problem to address' },
    { value: 'deliverable', label: 'Deliverable - Work completion or submission' },
    { value: 'payment', label: 'Payment - Invoice or billing related' },
    { value: 'scope_change', label: 'Scope Change - Project modifications' },
  ];

  const relationshipStageOptions = [
    { value: 'new', label: 'New - First time working together' },
    { value: 'established', label: 'Established - Regular working relationship' },
    { value: 'difficult', label: 'Difficult - Challenging relationship' },
    { value: 'long_term', label: 'Long-term - Years of collaboration' },
  ];

  const projectPhaseOptions = [
    { value: 'discovery', label: 'Discovery - Initial planning and requirements' },
    { value: 'active', label: 'Active - Currently working on deliverables' },
    { value: 'completion', label: 'Completion - Wrapping up final details' },
    { value: 'maintenance', label: 'Maintenance - Ongoing support phase' },
    { value: 'on_hold', label: 'On Hold - Project temporarily paused' },
  ];

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-3 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Advanced Options</h3>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {isExpanded ? 'Hide' : 'Show'} context settings
        </span>
      </button>

      <div className={`bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mt-3 space-y-4 ${isExpanded ? '' : 'hidden'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Client (Optional)
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => handleClientChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Select a client...</option>
            {clients?.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Selecting a client will auto-populate relationship stage
            </p>
            {/* TonePrint Badge - show if client has tone fingerprint */}
            {selectedClientId && (() => {
              const selectedClient = clients?.find((c) => c.id === selectedClientId);
              const fingerprint = selectedClient?.toneFingerprint as ToneFingerprint | undefined;
              return fingerprint && fingerprint.sampleCount >= 1 ? (
                <TonePrintBadge fingerprint={fingerprint} />
              ) : null;
            })()}
          </div>
        </div>

        {/* Project Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project (Optional)
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            disabled={!selectedClientId}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Select a project...</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Selecting a project will auto-populate project phase
          </p>
        </div>
        {/* Urgency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <span className="flex items-center gap-2">
              Urgency Level
              {suggestedContext?.urgency && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  AI suggested
                </span>
              )}
            </span>
          </label>
          <select
            {...register('context.urgency')}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 ${
              suggestedContext?.urgency
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onChange={(e) => handleFieldChange('urgency', e.target.value as any)}
          >
            {urgencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>


        {/* Message Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <span className="flex items-center gap-2">
              Message Type
              {suggestedContext?.messageType && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  AI suggested
                </span>
              )}
            </span>
          </label>
          <select
            {...register('context.messageType')}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 ${
              suggestedContext?.messageType
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onChange={(e) => handleFieldChange('messageType', e.target.value as any)}
          >
            {messageTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Relationship Stage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Client Relationship
          </label>
          <select
            {...register('context.relationshipStage')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
            onChange={(e) => handleFieldChange('relationshipStage', e.target.value as any)}
          >
            {relationshipStageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Project Phase */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Phase
          </label>
          <select
            {...register('context.projectPhase')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
            onChange={(e) => handleFieldChange('projectPhase', e.target.value as any)}
          >
            {projectPhaseOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Notes */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Additional Context (Optional)
          </label>
          <textarea
            {...register('context.customNotes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Any specific context or requirements for the response..."
          />
        </div>
      </div>
    </div>
  </div>
);
}
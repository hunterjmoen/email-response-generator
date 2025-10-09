import { useFormContext } from 'react-hook-form';
import { type ValidatedMessageInput, type ResponseContext } from '@freelance-flow/shared';

interface ContextSelectorProps {
  onChange?: (context: ResponseContext) => void;
}

export function ContextSelector({ onChange }: ContextSelectorProps) {
  const { register, watch, setValue } = useFormContext<ValidatedMessageInput>();

  const currentContext = watch('context');

  const handleFieldChange = (field: keyof ResponseContext, value: string) => {
    const newContext = { ...currentContext, [field]: value };
    setValue(`context.${field}`, value);
    onChange?.(newContext);
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
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Response Context</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Urgency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Urgency Level
          </label>
          <select
            {...register('context.urgency')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Type
          </label>
          <select
            {...register('context.messageType')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Relationship
          </label>
          <select
            {...register('context.relationshipStage')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Phase
          </label>
          <select
            {...register('context.projectPhase')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Context (Optional)
          </label>
          <textarea
            {...register('context.customNotes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any specific context or requirements for the response..."
          />
        </div>
      </div>
    </div>
  );
}
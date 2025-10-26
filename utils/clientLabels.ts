// Client relationship stage label mappings and utilities

export const RELATIONSHIP_STAGE_LABELS = {
  new: 'New Lead',
  established: 'Active Client',
  difficult: 'Needs Attention',
  long_term: 'Long-term Partner',
} as const;

export type RelationshipStage = keyof typeof RELATIONSHIP_STAGE_LABELS;

// Helper function to get label from stage value
export function getRelationshipStageLabel(stage: RelationshipStage): string {
  return RELATIONSHIP_STAGE_LABELS[stage];
}

// Color mappings for badges
export const RELATIONSHIP_STAGE_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  established: 'bg-green-100 text-green-800',
  difficult: 'bg-yellow-100 text-yellow-800',
  long_term: 'bg-purple-100 text-purple-800',
} as const;

export function getRelationshipStageColor(stage: RelationshipStage): string {
  return RELATIONSHIP_STAGE_COLORS[stage];
}

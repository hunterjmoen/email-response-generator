export interface HistorySearchFilters {
  keywords?: string;
  dateFrom?: string;
  dateTo?: string;
  context?: {
    relationshipStage?: string;
    projectPhase?: string;
    urgency?: string;
    messageType?: string;
  };
}

export interface HistoryListParams {
  limit?: number;
  cursor?: string;
  filters?: HistorySearchFilters;
}

export interface HistorySearchResult {
  id: string;
  originalMessage: string;
  context: any;
  generatedOptions: any[];
  selectedResponse?: number;
  userRating?: number;
  createdAt: string;
  snippet?: string; // Highlighted search snippet
}

export interface HistorySearchResponse {
  results: HistorySearchResult[];
  nextCursor?: string;
  totalCount: number;
  hasMore: boolean;
}

export interface DeleteHistoryParams {
  ids: string[];
  permanent?: boolean;
}

export interface BulkHistoryAction {
  action: 'delete' | 'export';
  ids: string[];
}
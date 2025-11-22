import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  type AIResponse,
  type AIResponseOptions,
  type ResponseContext,
  type ValidatedMessageInput,
} from '@freelance-flow/shared';

interface ResponseGenerationState {
  // Current workflow state
  currentInput: ValidatedMessageInput | null;
  currentResponse: AIResponse | null;
  selectedResponseIndex: number | null;
  isLoading: boolean;
  error: string | null;

  // History
  responseHistory: AIResponse[];

  // UI state
  showHistory: boolean;
  copiedResponseIndex: number | null;
  ratings: Record<string, number>; // historyId -> rating

  // Actions
  setCurrentInput: (input: ValidatedMessageInput | undefined) => void;
  setCurrentResponse: (response: AIResponse | undefined) => void;
  setSelectedResponseIndex: (index: number | undefined) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCopiedResponseIndex: (index: number | null) => void;
  setRating: (historyId: string, rating: number) => void;
  addToHistory: (response: AIResponse) => void;
  toggleHistory: () => void;
  clearCurrentWorkflow: () => void;
  reset: () => void;
}

const initialState = {
  currentInput: null,
  currentResponse: null,
  selectedResponseIndex: null,
  isLoading: false,
  error: null,
  responseHistory: [],
  showHistory: false,
  copiedResponseIndex: null,
  ratings: {},
};

export const useResponseGenerationStore = create<ResponseGenerationState>()(
  immer((set, get) => ({
    ...initialState,

    setCurrentInput: (input: ValidatedMessageInput | undefined) =>
      set((state) => {
        state.currentInput = input ?? null;
        state.error = null;
      }),

    setCurrentResponse: (response: AIResponse | undefined) =>
      set((state) => {
        state.currentResponse = response ?? null;
        state.selectedResponseIndex = null;
        state.error = null;
      }),

    setSelectedResponseIndex: (index: number | undefined) =>
      set((state) => {
        state.selectedResponseIndex = index ?? null;
      }),

    setLoading: (loading: boolean) =>
      set((state) => {
        state.isLoading = loading;
        if (loading) {
          state.error = null;
        }
      }),

    setError: (error: string | null) =>
      set((state) => {
        state.error = error;
        state.isLoading = false;
      }),

    setCopiedResponseIndex: (index: number | null) =>
      set((state) => {
        state.copiedResponseIndex = index;
      }),

    setRating: (historyId: string, rating: number) =>
      set((state) => {
        state.ratings[historyId] = rating;
      }),

    addToHistory: (response: AIResponse) =>
      set((state) => {
        // Add to beginning of history (most recent first)
        state.responseHistory.unshift(response);

        // Keep only the last 50 responses
        if (state.responseHistory.length > 50) {
          state.responseHistory = state.responseHistory.slice(0, 50);
        }
      }),

    toggleHistory: () =>
      set((state) => {
        state.showHistory = !state.showHistory;
      }),

    clearCurrentWorkflow: () =>
      set((state) => {
        state.currentInput = null;
        state.currentResponse = null;
        state.selectedResponseIndex = null;
        state.error = null;
        state.copiedResponseIndex = null;
      }),

    reset: () =>
      set((state) => {
        Object.assign(state, initialState);
      }),
  }))
);

// Selectors for computed values
export const useCurrentResponseOptions = () => {
  const currentResponse = useResponseGenerationStore(
    (state) => state.currentResponse
  );
  return currentResponse?.options || [];
};

export const useSelectedResponse = () => {
  const currentResponse = useResponseGenerationStore(
    (state) => state.currentResponse
  );
  const selectedIndex = useResponseGenerationStore(
    (state) => state.selectedResponseIndex
  );

  if (!currentResponse || selectedIndex === null) {
    return null;
  }

  return currentResponse.options[selectedIndex] || null;
};

export const useWorkflowState = () => {
  const store = useResponseGenerationStore();
  return {
    hasInput: !!store.currentInput,
    hasResponse: !!store.currentResponse,
    hasSelection: store.selectedResponseIndex !== null,
    isComplete: !!(store.currentInput && store.currentResponse && store.selectedResponseIndex !== null),
    canGenerate: !!store.currentInput && !store.isLoading,
  };
};
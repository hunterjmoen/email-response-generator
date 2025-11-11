import { useState, useCallback, useRef } from 'react';
import { type ResponseContext, type AIResponseOptions } from '@freelance-flow/shared';
import { supabase } from '../utils/supabase';

interface StreamingResponse {
  index: number;
  content: string;
  tone: string;
  length: string;
  confidence: number;
  reasoning: string;
  isComplete: boolean;
}

interface UseStreamingResponseReturn {
  responses: StreamingResponse[];
  isStreaming: boolean;
  error: string | null;
  historyId: string | null;
  generateResponses: (originalMessage: string, context: ResponseContext) => Promise<void>;
  cancelStream: () => void;
}

export function useStreamingResponse(): UseStreamingResponseReturn {
  const [responses, setResponses] = useState<StreamingResponse[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const generateResponses = useCallback(
    async (originalMessage: string, context: ResponseContext) => {
      // Reset state
      setResponses([]);
      setError(null);
      setHistoryId(null);
      setIsStreaming(true);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      try {
        // Get the access token from the session
        const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession();

        console.log('[Streaming Hook] Session check:', {
          hasSession: !!supabaseSession,
          hasToken: !!supabaseSession?.access_token,
          error: sessionError?.message
        });

        const token = supabaseSession?.access_token;

        if (!token) {
          throw new Error('Not authenticated - please log in again');
        }

        console.log('[Streaming Hook] Sending request with token length:', token.length);

        const response = await fetch('/api/responses/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            originalMessage,
            context,
          }),
          signal: abortControllerRef.current.signal,
        });

        console.log('[Streaming Hook] Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('[Streaming Hook] Error response:', errorData);
          throw new Error(errorData.error || `Failed to start streaming (${response.status})`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        // Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete messages (split by \n\n)
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || ''; // Keep incomplete message in buffer

          for (const message of messages) {
            if (!message.trim() || !message.startsWith('data: ')) {
              continue;
            }

            try {
              const data = JSON.parse(message.substring(6)); // Remove 'data: ' prefix

              if (data.type === 'start' && data.responseIndex !== undefined) {
                // Initialize new response
                setResponses((prev) => {
                  const updated = [...prev];
                  updated[data.responseIndex] = {
                    index: data.responseIndex,
                    content: '',
                    tone: '',
                    length: '',
                    confidence: 0.8,
                    reasoning: '',
                    isComplete: false,
                  };
                  return updated;
                });
              } else if (data.type === 'content' && data.responseIndex !== undefined && data.content) {
                // Append content
                setResponses((prev) => {
                  const updated = [...prev];
                  if (updated[data.responseIndex]) {
                    updated[data.responseIndex] = {
                      ...updated[data.responseIndex],
                      content: updated[data.responseIndex].content + data.content,
                    };
                  }
                  return updated;
                });
              } else if (data.type === 'complete' && data.responseIndex !== undefined && data.metadata) {
                // Mark as complete with metadata
                setResponses((prev) => {
                  const updated = [...prev];
                  if (updated[data.responseIndex]) {
                    updated[data.responseIndex] = {
                      ...updated[data.responseIndex],
                      tone: data.metadata.tone || 'professional',
                      length: data.metadata.length || 'standard',
                      confidence: data.metadata.confidence || 0.8,
                      reasoning: data.metadata.reasoning || '',
                      isComplete: true,
                    };
                  }
                  return updated;
                });
              } else if (data.type === 'done' && data.historyId) {
                // Stream completed successfully
                setHistoryId(data.historyId);
              } else if (data.type === 'error') {
                // Error occurred
                setError(data.error || 'An error occurred during generation');
              }
            } catch (parseError) {
              console.error('Failed to parse SSE message:', parseError);
            }
          }
        }

        setIsStreaming(false);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Stream cancelled by user');
          setError('Generation cancelled');
        } else {
          console.error('Streaming error:', err);
          setError(err.message || 'Failed to generate responses');
        }
        setIsStreaming(false);
      }
    },
    [] // No dependencies needed - we get session fresh on each call
  );

  return {
    responses,
    isStreaming,
    error,
    historyId,
    generateResponses,
    cancelStream,
  };
}

/**
 * Convert streaming responses to AIResponseOptions format
 */
export function convertStreamingToAIResponse(streamingResponses: StreamingResponse[]): AIResponseOptions[] {
  return streamingResponses
    .filter(r => r.isComplete)
    .map(r => ({
      content: r.content,
      tone: r.tone as 'professional' | 'casual' | 'formal',
      length: r.length as 'brief' | 'standard' | 'detailed',
      confidence: r.confidence,
      reasoning: r.reasoning,
    }));
}

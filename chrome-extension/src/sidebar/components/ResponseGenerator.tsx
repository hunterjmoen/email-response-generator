import React, { useState } from 'react';
import { generateResponsesStream, type StreamChunk } from '../../shared/api-client';
import type { EmailData, Client } from '../../shared/types';

interface StreamingResponse {
  id: string;
  content: string;
  tone: string;
  confidence: number;
  isComplete: boolean;
}

interface ResponseGeneratorProps {
  email: EmailData;
  client: Client | null;
}

export function ResponseGenerator({ email, client }: ResponseGeneratorProps) {
  const [responses, setResponses] = useState<StreamingResponse[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Context options
  const [urgency, setUrgency] = useState<'immediate' | 'standard' | 'non_urgent'>('standard');
  const [messageType, setMessageType] = useState<'update' | 'question' | 'concern' | 'deliverable' | 'payment' | 'scope_change'>('update');
  const [relationshipStage, setRelationshipStage] = useState<'new' | 'established' | 'difficult' | 'long_term'>('established');
  const [projectPhase, setProjectPhase] = useState<'discovery' | 'active' | 'completion' | 'maintenance' | 'on_hold'>('active');

  const MAX_MESSAGE_LENGTH = 2000;

  const handleChunk = (chunk: StreamChunk) => {
    if (chunk.type === 'start' && chunk.responseIndex !== undefined) {
      // Initialize new response card
      setResponses(prev => {
        const updated = [...prev];
        updated[chunk.responseIndex!] = {
          id: `response-${chunk.responseIndex}`,
          content: '',
          tone: '',
          confidence: 0.8,
          isComplete: false,
        };
        return updated;
      });
    } else if (chunk.type === 'content' && chunk.responseIndex !== undefined && chunk.content) {
      // Append streaming content
      setResponses(prev => {
        const updated = [...prev];
        if (updated[chunk.responseIndex!]) {
          updated[chunk.responseIndex!] = {
            ...updated[chunk.responseIndex!],
            content: updated[chunk.responseIndex!].content + chunk.content,
          };
        }
        return updated;
      });
    } else if (chunk.type === 'complete' && chunk.responseIndex !== undefined && chunk.metadata) {
      // Mark complete with metadata
      setResponses(prev => {
        const updated = [...prev];
        if (updated[chunk.responseIndex!]) {
          updated[chunk.responseIndex!] = {
            ...updated[chunk.responseIndex!],
            tone: chunk.metadata!.tone || 'professional',
            confidence: chunk.metadata!.confidence || 0.8,
            isComplete: true,
          };
        }
        return updated;
      });
    } else if (chunk.type === 'error' && chunk.error) {
      setError(chunk.error);
    }
  };

  const handleGenerate = async () => {
    if (!email.body) return;

    // Truncate message if too long
    let message = email.body.trim();
    if (message.length > MAX_MESSAGE_LENGTH) {
      message = message.substring(0, MAX_MESSAGE_LENGTH);
    }

    if (message.length < 10) {
      setError('Message is too short to generate responses');
      return;
    }

    setIsStreaming(true);
    setError(null);
    setResponses([]);
    setSelectedResponse(null);

    try {
      await generateResponsesStream(
        {
          originalMessage: message,
          context: {
            urgency,
            messageType,
            relationshipStage,
            projectPhase,
            clientId: client?.id,
            clientName: client?.name,
          },
        },
        handleChunk
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate responses';
      setError(errorMessage);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!email.body) {
    return (
      <div className="p-4">
        <div className="text-center text-gray-500 text-sm">
          No email content to respond to
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Client header */}
      {client && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg px-3 py-2">
          <p className="text-sm text-primary-700">
            <span className="font-medium">Responding to:</span> {client.name}
            {client.company && <span className="text-primary-500"> ({client.company})</span>}
          </p>
        </div>
      )}

      {/* Context options */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Urgency
          </label>
          <div className="flex gap-2">
            {([
              { value: 'non_urgent', label: 'Low' },
              { value: 'standard', label: 'Standard' },
              { value: 'immediate', label: 'Urgent' },
            ] as const).map((option) => (
              <button
                key={option.value}
                onClick={() => setUrgency(option.value)}
                className={`flex-1 py-1.5 px-3 text-sm rounded-lg border transition-colors ${
                  urgency === option.value
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message Type
          </label>
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value as typeof messageType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="update">Project Update</option>
            <option value="question">Question</option>
            <option value="concern">Concern</option>
            <option value="deliverable">Deliverable</option>
            <option value="payment">Payment</option>
            <option value="scope_change">Scope Change</option>
          </select>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isStreaming}
        className="btn-primary w-full text-sm disabled:opacity-50"
      >
        {isStreaming ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Generating...
          </span>
        ) : (
          'Generate Responses'
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Response options */}
      {responses.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            {isStreaming ? 'Generating responses...' : 'Choose a response:'}
          </h4>

          {responses.map((response) => (
            <div
              key={response.id}
              onClick={() => response.isComplete && setSelectedResponse(response.id)}
              className={`p-3 rounded-lg border transition-colors ${
                !response.isComplete
                  ? 'border-primary-200 bg-primary-50/50'
                  : selectedResponse === response.id
                  ? 'border-primary-300 bg-primary-50 cursor-pointer'
                  : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {response.tone || (response.isComplete ? 'professional' : 'generating...')}
                </span>
                {response.isComplete && (
                  <span className="text-xs text-gray-400">
                    {Math.round(response.confidence * 100)}% match
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {response.content}
                {!response.isComplete && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary-500 animate-pulse" />
                )}
              </p>

              {response.isComplete && selectedResponse === response.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(response.content);
                  }}
                  className="mt-3 w-full py-1.5 px-3 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state after generation */}
      {!isStreaming && responses.length === 0 && !error && (
        <div className="text-center text-gray-500 text-sm py-4">
          Click "Generate Responses" to create AI-powered reply options
        </div>
      )}
    </div>
  );
}

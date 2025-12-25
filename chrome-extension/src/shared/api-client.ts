// API Client for FreelanceFlow Extension
// Makes authenticated requests to the FreelanceFlow backend

import { API_BASE_URL, MESSAGE_TYPES } from './constants';
import { getValidAccessToken, clearAuthData } from './storage';
import type { Client, CreateClientPayload, ResponseOption, ScopeCreepResult } from './types';

/**
 * Custom error class for authentication failures
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Base fetch wrapper with authentication
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getValidAccessToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Handle authentication failures (expired or invalid tokens)
  if (response.status === 401) {
    // Clear stored auth data since token is invalid/expired
    await clearAuthData();

    // Notify other parts of the extension that auth state changed
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.AUTH_STATE_CHANGED,
      payload: { isAuthenticated: false, user: null, accessToken: null, loading: false },
    }).catch(() => {
      // Ignore if no listeners
    });

    throw new AuthError('Session expired. Please sign in again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * tRPC-style request wrapper
 * FreelanceFlow uses tRPC, so we need to format requests accordingly
 */
async function trpcQuery<T>(
  procedure: string,
  input?: unknown
): Promise<T> {
  // tRPC format - send input directly as query param
  const params = input
    ? `?input=${encodeURIComponent(JSON.stringify(input))}`
    : '';
  const result = await apiFetch<{ result: { data: T } }>(
    `/api/trpc/${procedure}${params}`
  );
  return result.result.data;
}

async function trpcMutation<T>(
  procedure: string,
  input: unknown
): Promise<T> {
  // tRPC format - send input directly
  const result = await apiFetch<{ result: { data: T } }>(
    `/api/trpc/${procedure}`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
  return result.result.data;
}

// ============ Client API ============

/**
 * Look up a client by email address
 */
export async function getClientByEmail(email: string): Promise<Client | null> {
  try {
    return await trpcQuery<Client | null>('clients.getByEmail', { email });
  } catch {
    return null;
  }
}

/**
 * Create a new client
 */
export async function createClient(data: CreateClientPayload): Promise<Client> {
  return trpcMutation<Client>('clients.create', data);
}

/**
 * Get client by ID
 */
export async function getClientById(id: string): Promise<Client | null> {
  try {
    return await trpcQuery<Client | null>('clients.getById', { id });
  } catch {
    return null;
  }
}

// ============ Response Generation API ============

interface GenerateResponseInput {
  originalMessage: string;
  context: {
    clientId?: string;
    clientName?: string;
    urgency: 'immediate' | 'standard' | 'non_urgent';
    messageType: 'update' | 'question' | 'concern' | 'deliverable' | 'payment' | 'scope_change';
    relationshipStage: 'new' | 'established' | 'difficult' | 'long_term';
    projectPhase: 'discovery' | 'active' | 'completion' | 'maintenance' | 'on_hold';
  };
}

// Server response structure for responses.generate
interface GenerateResponseServerResult {
  response: {
    id: string;
    options: Array<{
      content: string;
      tone: string;
      confidence: number;
      length?: string;
      reasoning?: string;
    }>;
  };
  historyId: string;
}

/**
 * Generate AI response options
 */
export async function generateResponses(
  input: GenerateResponseInput
): Promise<ResponseOption[]> {
  const result = await trpcMutation<GenerateResponseServerResult>('responses.generate', input);

  // Extract options from nested response and add IDs
  return result.response.options.map((option, index) => ({
    id: `${result.historyId}-${index}`,
    content: option.content,
    tone: option.tone,
    confidence: option.confidence,
  }));
}

// Streaming response types
export interface StreamChunk {
  type: 'start' | 'content' | 'complete' | 'done' | 'error';
  responseIndex?: number;
  content?: string;
  metadata?: {
    tone: string;
    length: string;
    confidence: number;
    reasoning: string;
  };
  historyId?: string;
  error?: string;
}

/**
 * Generate AI responses with streaming
 * Calls the SSE endpoint and invokes onChunk for each streamed piece
 */
export async function generateResponsesStream(
  input: GenerateResponseInput,
  onChunk: (chunk: StreamChunk) => void
): Promise<void> {
  const token = await getValidAccessToken();

  if (!token) {
    throw new AuthError('Not authenticated. Please sign in again.');
  }

  const response = await fetch(`${API_BASE_URL}/api/responses/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      originalMessage: input.originalMessage,
      context: input.context,
    }),
  });

  if (response.status === 401) {
    await clearAuthData();
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.AUTH_STATE_CHANGED,
      payload: { isAuthenticated: false, user: null, accessToken: null, loading: false },
    }).catch(() => {});
    throw new AuthError('Session expired. Please sign in again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  // Read the SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete messages (SSE format: data: {...}\n\n)
    const messages = buffer.split('\n\n');
    buffer = messages.pop() || '';

    for (const message of messages) {
      if (!message.trim() || !message.startsWith('data: ')) continue;

      try {
        const chunk: StreamChunk = JSON.parse(message.substring(6));
        onChunk(chunk);
      } catch {
        // Skip malformed messages
      }
    }
  }
}

// ============ Context Detection API ============

interface DetectContextInput {
  message: string;
}

interface DetectContextResult {
  scopeCreepDetected: boolean;
  scopeCreepConfidence: number;
  scopeCreepPhrases: string[];
  relationshipStage?: string;
  projectPhase?: string;
  urgency?: string;
}

/**
 * Detect context from message (scope creep, urgency, etc.)
 */
export async function detectContext(
  input: DetectContextInput
): Promise<DetectContextResult> {
  return trpcMutation<DetectContextResult>('context.detect', input);
}

/**
 * Check for scope creep in message
 * Truncates message to 2000 chars to match backend validation
 */
export async function checkScopeCreep(message: string): Promise<ScopeCreepResult> {
  const truncatedMessage = message.length > 2000 ? message.substring(0, 2000) : message;
  const result = await detectContext({ message: truncatedMessage });
  return {
    detected: result.scopeCreepDetected,
    confidence: result.scopeCreepConfidence,
    phrases: result.scopeCreepPhrases,
    suggestions: [], // Could add suggestions based on detected phrases
  };
}

// ============ Change Order API ============

interface CreateChangeOrderInput {
  title: string;
  description: string;
  clientId?: string;
  projectId?: string;
  lineItems: Array<{
    description: string;
    hours: number;
    rate: number;
  }>;
  originalRequest?: string;
  detectedPhrases?: string[];
}

interface ChangeOrder {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  lineItems: Array<{
    id: string;
    description: string;
    hours: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  createdAt: string;
}

/**
 * Create a change order
 */
export async function createChangeOrder(
  input: CreateChangeOrderInput
): Promise<ChangeOrder> {
  return trpcMutation<ChangeOrder>('changeOrders.create', input);
}

// ============ Auth API ============

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

/**
 * Login to FreelanceFlow
 * Uses a simple REST endpoint instead of tRPC for reliability
 */
export async function login(input: LoginInput): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/extension/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Logout from FreelanceFlow
 */
export async function logout(): Promise<void> {
  await trpcMutation<void>('auth.logout', {});
}

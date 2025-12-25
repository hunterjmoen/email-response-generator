// FreelanceFlow Extension Types

import { MESSAGE_TYPES } from './constants';

// User type (simplified from main app)
export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

// Auth state
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  loading: boolean;
}

// Client type (supports both snake_case from DB and camelCase from API)
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  notes?: string;
  // Support both naming conventions
  relationship_stage?: 'new' | 'established' | 'difficult' | 'long_term';
  relationshipStage?: 'new' | 'established' | 'difficult' | 'long_term';
  priority?: 'low' | 'medium' | 'high';
  health_score?: number;
  healthScore?: number;
  tags?: string[];
  is_archived?: boolean;
  isArchived?: boolean;
  last_contact_date?: string;
  lastContactDate?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

// Email data extracted from Gmail
export interface EmailData {
  senderEmail: string;
  senderName: string;
  subject: string;
  body: string;
  threadId?: string;
  messageId?: string;
  timestamp: string;
}

// Scope creep detection result
export interface ScopeCreepResult {
  detected: boolean;
  confidence: number;
  phrases: string[];
  suggestions: string[];
}

// AI Response option
export interface ResponseOption {
  id: string;
  content: string;
  tone: string;
  confidence: number;
}

// Message types for extension communication
export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
}

// Login request
export interface LoginPayload {
  email: string;
  password: string;
}

// Login response
export interface LoginResponse {
  success: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

// API request message
export interface ApiRequestPayload {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

// Create client payload (uses camelCase for server API)
export interface CreateClientPayload {
  name: string;
  email: string;
  company?: string;
  relationshipStage?: 'new' | 'established' | 'difficult' | 'long_term';
}

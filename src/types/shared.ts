export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  industry?: string;
  communicationStyle: {
    formality: 'casual' | 'professional' | 'formal';
    tone: 'friendly' | 'neutral' | 'direct';
    length: 'brief' | 'standard' | 'detailed';
  };
  subscription: {
    tier: 'free' | 'premium';
    status: 'active' | 'cancelled' | 'expired';
    usageCount: number;
    billingCycle?: string;
  };
  preferences: {
    defaultContext: ResponseContext;
    emailNotifications: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ResponseContext {
  relationshipStage: 'new' | 'established' | 'difficult' | 'long_term';
  projectPhase: 'discovery' | 'active' | 'completion' | 'maintenance' | 'on_hold';
  urgency: 'immediate' | 'standard' | 'non_urgent';
  messageType: 'update' | 'question' | 'concern' | 'deliverable' | 'payment' | 'scope_change';
  customNotes?: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

export interface AIResponseOptions {
  content: string;
  tone: 'professional' | 'casual' | 'formal';
  length: 'brief' | 'standard' | 'detailed';
  confidence: number; // 0-1 scale
  reasoning?: string;
}

export interface AIResponse {
  id: string;
  options: AIResponseOptions[];
  originalMessage: string;
  context: ResponseContext;
  historyId: string;
  model: string;
  generatedAt: string;
  cost?: number; // API cost in cents
}

export interface ResponseHistory {
  id: string;
  userId: string;
  originalMessage: string;
  context: ResponseContext;
  generatedOptions: AIResponseOptions[];
  selectedResponse?: number;
  userRating?: number; // 1-5
  userFeedback?: string;
  templateUsed?: string;
  refinementCount: number;
  refinementInstructions?: string;
  openaiModel: string;
  generationCostCents?: number;
  confidenceScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateResponseInput {
  originalMessage: string;
  context: ResponseContext;
  templateId?: string;
  refinementInstructions?: string;
}

export interface GenerateResponseOutput {
  response: AIResponse;
  historyId: string;
}

export interface ResponseFeedback {
  historyId: string;
  selectedResponse: number;
  rating?: number;
  feedback?: string;
}

// Validation schemas for input
export interface MessageValidation {
  minLength: number;
  maxLength: number;
}

export const MESSAGE_VALIDATION: MessageValidation = {
  minLength: 10,
  maxLength: 2000,
};
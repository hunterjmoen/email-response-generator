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
    tier: 'free' | 'professional' | 'premium';
    status: 'active' | 'cancelled' | 'expired';
    usageCount: number;
    monthlyLimit: number;
    billingCycle?: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
  };
  stripe_customer_id?: string;
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
  clientName?: string;
  userName?: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}
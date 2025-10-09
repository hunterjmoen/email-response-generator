# Data Models

Define the core data models/entities that will be shared between frontend and backend:

## User

**Purpose:** Represents freelancers using the platform with their profile settings, subscription status, and communication preferences for AI response generation.

**Key Attributes:**
- id: string - Unique identifier (Supabase UUID)
- email: string - Primary authentication and communication
- profile: UserProfile - Communication style and preferences
- subscription: SubscriptionTier - Current plan and usage limits
- createdAt: Date - Account creation timestamp

### TypeScript Interface
```typescript
interface User {
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
    billingCycle?: Date;
  };
  preferences: {
    defaultContext: ResponseContext;
    emailNotifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Relationships
- One-to-many with ResponseHistory
- One-to-many with CustomTemplates

## ResponseHistory

**Purpose:** Stores all AI-generated responses with context and user feedback for learning patterns, reuse, and analytics.

**Key Attributes:**
- id: string - Unique response identifier
- userId: string - Owner reference
- originalMessage: string - Client message input
- context: ResponseContext - Communication context used
- generatedOptions: AIResponse[] - All generated variants
- selectedResponse: string - User's chosen response
- userRating: number - Quality feedback (1-5 stars)

### TypeScript Interface
```typescript
interface ResponseHistory {
  id: string;
  userId: string;
  originalMessage: string;
  context: ResponseContext;
  generatedOptions: AIResponse[];
  selectedResponse?: string;
  userRating?: number;
  templateUsed?: string;
  refinementCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AIResponse {
  id: string;
  content: string;
  tone: 'professional' | 'casual' | 'formal';
  length: number;
  confidence: number;
  reasoning?: string;
}
```

### Relationships
- Many-to-one with User
- Many-to-one with Template (optional)

## ResponseContext

**Purpose:** Captures the communication situation context that drives AI response generation quality and appropriateness.

**Key Attributes:**
- relationshipStage: string - Client relationship phase
- projectPhase: string - Current project status
- urgency: string - Communication urgency level
- messageType: string - Type of client communication

### TypeScript Interface
```typescript
interface ResponseContext {
  relationshipStage: 'new' | 'established' | 'difficult' | 'long_term';
  projectPhase: 'discovery' | 'active' | 'completion' | 'maintenance' | 'on_hold';
  urgency: 'immediate' | 'standard' | 'non_urgent';
  messageType: 'update' | 'question' | 'concern' | 'deliverable' | 'payment' | 'scope_change';
  customNotes?: string;
}
```

### Relationships
- Used by ResponseHistory
- Used by Template definitions

## Template

**Purpose:** Pre-built scenario frameworks for common freelancer communication situations, enabling consistent and efficient response generation.

**Key Attributes:**
- id: string - Template identifier
- name: string - Human-readable template name
- category: string - Template grouping
- systemTemplate: boolean - Built-in vs user-created
- defaultContext: ResponseContext - Pre-configured context
- variables: TemplateVariable[] - Customizable placeholders

### TypeScript Interface
```typescript
interface Template {
  id: string;
  name: string;
  category: 'project_updates' | 'scope_discussions' | 'payment_reminders' | 'timeline_changes' | 'deliverables' | 'custom';
  description: string;
  systemTemplate: boolean;
  userId?: string; // null for system templates
  defaultContext: ResponseContext;
  promptTemplate: string;
  variables: TemplateVariable[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  defaultValue?: string;
  options?: string[]; // for select type
}
```

### Relationships
- One-to-many with ResponseHistory
- Many-to-one with User (for custom templates)

## Subscription

**Purpose:** Manages user billing, usage limits, and feature access for freemium business model implementation.

**Key Attributes:**
- userId: string - User reference
- tier: SubscriptionTier - Current plan level
- status: string - Billing status
- usageTracking: UsageMetrics - Monthly limits and consumption

### TypeScript Interface
```typescript
interface Subscription {
  userId: string;
  tier: 'free' | 'premium';
  status: 'active' | 'cancelled' | 'past_due' | 'expired';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  usage: {
    responsesGenerated: number;
    monthlyLimit: number;
    resetDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Relationships
- One-to-one with User
- One-to-many with UsageEvents (for analytics)

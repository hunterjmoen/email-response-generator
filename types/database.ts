// Database row types for Supabase queries
// These types match the database schema (snake_case)

export interface ClientRow {
  id: string;
  user_id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
  relationship_stage: 'new' | 'established' | 'difficult' | 'long_term';
  tags?: string[] | null;
  priority?: 'low' | 'medium' | 'high' | null;
  is_archived?: boolean | null;
  last_contact_date?: string | null;
  health_score?: number | null;
  stripe_customer_id?: string | null;
  created_at: string;
  updated_at: string;
  // For aggregated queries
  projects?: Array<{ count: number }>;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  client_id: string;
  name: string;
  description?: string | null;
  status: 'active' | 'completed' | 'on_hold' | 'archived';
  budget?: string | number | null;
  deadline?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  industry?: string | null;
  communication_style?: any;
  preferences?: any;
  stripe_customer_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRow {
  user_id: string;
  tier: 'free' | 'professional' | 'premium';
  status: 'active' | 'cancelled' | 'past_due' | 'expired' | 'trialing';
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  usage_count: number;
  monthly_limit: number;
  usage_reset_date?: string | null;
  billing_interval?: 'monthly' | 'annual' | null;
  has_used_trial: boolean;
  cancel_at_period_end?: boolean | null;
  scheduled_tier?: 'free' | 'professional' | 'premium' | null;
  scheduled_tier_change_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateRow {
  id: string;
  user_id: string;
  name: string;
  content: string;
  category?: string | null;
  tags?: string[] | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResponseHistoryRow {
  id: string;
  user_id: string;
  client_id?: string | null;
  project_id?: string | null;
  input_context: any;
  generated_response: string;
  was_edited: boolean;
  final_response?: string | null;
  feedback_rating?: number | null;
  created_at: string;
}

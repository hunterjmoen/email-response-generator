// Supabase Database type for proper TypeScript inference
// This file provides the Database generic type for Supabase client

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          industry: string | null
          communication_style: Json | null
          preferences: Json | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          industry?: string | null
          communication_style?: Json | null
          preferences?: Json | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          industry?: string | null
          communication_style?: Json | null
          preferences?: Json | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          tier: 'free' | 'pro' | 'enterprise'
          status: 'active' | 'inactive' | 'cancelled'
          usage_count: number
          monthly_limit: number
          usage_reset_date: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier?: 'free' | 'pro' | 'enterprise'
          status?: 'active' | 'inactive' | 'cancelled'
          usage_count?: number
          monthly_limit?: number
          usage_reset_date?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier?: 'free' | 'pro' | 'enterprise'
          status?: 'active' | 'inactive' | 'cancelled'
          usage_count?: number
          monthly_limit?: number
          usage_reset_date?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          company: string | null
          phone: string | null
          website: string | null
          notes: string | null
          relationship_stage: 'new' | 'established' | 'difficult' | 'long_term'
          tags: string[] | null
          priority: 'low' | 'medium' | 'high' | null
          is_archived: boolean | null
          last_contact_date: string | null
          health_score: number | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          company?: string | null
          phone?: string | null
          website?: string | null
          notes?: string | null
          relationship_stage?: 'new' | 'established' | 'difficult' | 'long_term'
          tags?: string[] | null
          priority?: 'low' | 'medium' | 'high' | null
          is_archived?: boolean | null
          last_contact_date?: string | null
          health_score?: number | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          company?: string | null
          phone?: string | null
          website?: string | null
          notes?: string | null
          relationship_stage?: 'new' | 'established' | 'difficult' | 'long_term'
          tags?: string[] | null
          priority?: 'low' | 'medium' | 'high' | null
          is_archived?: boolean | null
          last_contact_date?: string | null
          health_score?: number | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          client_id: string
          name: string
          description: string | null
          status: 'active' | 'completed' | 'on_hold' | 'archived'
          budget: string | number | null
          deadline: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          name: string
          description?: string | null
          status?: 'active' | 'completed' | 'on_hold' | 'archived'
          budget?: string | number | null
          deadline?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string
          name?: string
          description?: string | null
          status?: 'active' | 'completed' | 'on_hold' | 'archived'
          budget?: string | number | null
          deadline?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      response_history: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          project_id: string | null
          input_context: Json
          generated_response: string
          was_edited: boolean
          final_response: string | null
          feedback_rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id?: string | null
          project_id?: string | null
          input_context: Json
          generated_response: string
          was_edited?: boolean
          final_response?: string | null
          feedback_rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string | null
          project_id?: string | null
          input_context?: Json
          generated_response?: string
          was_edited?: boolean
          final_response?: string | null
          feedback_rating?: number | null
          created_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          user_id: string
          name: string
          content: string
          category: string | null
          tags: string[] | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          content: string
          category?: string | null
          tags?: string[] | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          content?: string
          category?: string | null
          tags?: string[] | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

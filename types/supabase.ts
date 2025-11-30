export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          health_score: number | null
          id: string
          is_archived: boolean | null
          last_contact_date: string | null
          name: string
          notes: string | null
          phone: string | null
          priority: string | null
          relationship_stage: string
          tags: string[] | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          health_score?: number | null
          id?: string
          is_archived?: boolean | null
          last_contact_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          priority?: string | null
          relationship_stage?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          health_score?: number | null
          id?: string
          is_archived?: boolean | null
          last_contact_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          priority?: string | null
          relationship_stage?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_templates: {
        Row: {
          id: string
          name: string
          description: string
          message_template: string
          category: string
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          message_template: string
          category: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          message_template?: string
          category?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          client_id: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          client_id?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      response_history: {
        Row: {
          confidence_score: number | null
          context: Json
          copied_response_id: string | null
          created_at: string
          generated_options: Json
          generation_cost_cents: number | null
          id: string
          openai_model: string
          original_message: string
          original_message_encrypted: string | null
          refinement_count: number
          refinement_instructions: string | null
          selected_response: number | null
          selected_response_encrypted: string | null
          template_used: string | null
          updated_at: string
          user_feedback: string | null
          user_id: string
          user_rating: number | null
        }
        Insert: {
          confidence_score?: number | null
          context?: Json
          copied_response_id?: string | null
          created_at?: string
          generated_options: Json
          generation_cost_cents?: number | null
          id?: string
          openai_model?: string
          original_message: string
          original_message_encrypted?: string | null
          refinement_count?: number
          refinement_instructions?: string | null
          selected_response?: number | null
          selected_response_encrypted?: string | null
          template_used?: string | null
          updated_at?: string
          user_feedback?: string | null
          user_id: string
          user_rating?: number | null
        }
        Update: {
          confidence_score?: number | null
          context?: Json
          copied_response_id?: string | null
          created_at?: string
          generated_options?: Json
          generation_cost_cents?: number | null
          id?: string
          openai_model?: string
          original_message?: string
          original_message_encrypted?: string | null
          refinement_count?: number
          refinement_instructions?: string | null
          selected_response?: number | null
          selected_response_encrypted?: string | null
          template_used?: string | null
          updated_at?: string
          user_feedback?: string | null
          user_id?: string
          user_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "response_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          has_used_trial: boolean
          monthly_limit: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          usage_count: number
          usage_reset_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          has_used_trial?: boolean
          monthly_limit?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          usage_count?: number
          usage_reset_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          has_used_trial?: boolean
          monthly_limit?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          usage_count?: number
          usage_reset_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          communication_style: Json
          created_at: string
          email: string
          first_name: string
          id: string
          industry: string | null
          last_name: string
          preferences: Json
          privacy_settings: Json
          style_profile: Json | null
          updated_at: string
        }
        Insert: {
          communication_style?: Json
          created_at?: string
          email: string
          first_name: string
          id?: string
          industry?: string | null
          last_name: string
          preferences?: Json
          privacy_settings?: Json
          style_profile?: Json | null
          updated_at?: string
        }
        Update: {
          communication_style?: Json
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          industry?: string | null
          last_name?: string
          preferences?: Json
          privacy_settings?: Json
          style_profile?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_client_health_score: {
        Args: { client_id: string }
        Returns: number
      }
      create_user_subscription: {
        Args: { user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

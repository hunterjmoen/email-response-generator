// Client & Project Management Types

export interface Client {
  id: string;
  userId: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  website?: string;
  notes?: string;
  relationshipStage: 'new' | 'established' | 'difficult' | 'long_term';
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  isArchived?: boolean;
  lastContactDate?: string; // ISO 8601 date string from database
  healthScore?: number;
  createdAt: string; // ISO 8601 date string from database
  updatedAt: string; // ISO 8601 date string from database
  projectCount?: number; // Optional - included in list queries
}

export interface Project {
  id: string;
  userId: string;
  clientId: string;
  name: string;
  description?: string;
  status: 'discovery' | 'active' | 'completion' | 'maintenance' | 'on_hold';
  budget?: number;
  deadline?: string; // ISO 8601 date string from database
  createdAt: string; // ISO 8601 date string from database
  updatedAt: string; // ISO 8601 date string from database
}

// Helper type for client with projects
export interface ClientWithProjects extends Client {
  projects?: Project[];
}

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
  lastContactDate?: Date;
  healthScore?: number;
  createdAt: Date;
  updatedAt: Date;
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
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Helper type for client with projects
export interface ClientWithProjects extends Client {
  projects?: Project[];
}

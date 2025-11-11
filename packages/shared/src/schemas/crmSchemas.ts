import { z } from 'zod';

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format").optional().or(z.literal('')),
  company: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url("Invalid URL format").optional().or(z.literal('')),
  notes: z.string().optional(),
  relationshipStage: z.enum(['new', 'established', 'difficult', 'long_term']),
  tags: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  isArchived: z.boolean().optional(),
  lastContactDate: z.union([z.string(), z.date()]).transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }).optional(),
  healthScore: z.number().min(0).max(100).optional(),
});

export const projectSchema = z.object({
  clientId: z.string().uuid("Client is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(['discovery', 'active', 'completion', 'maintenance', 'on_hold']),
  budget: z.number().optional(),
  deadline: z.union([z.string(), z.date()]).transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }).optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;

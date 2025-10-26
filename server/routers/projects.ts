import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { projectSchema } from '@freelance-flow/shared';
import { TRPCError } from '@trpc/server';
import type { Project } from '@freelance-flow/shared';

export const projectRouter = router({
  listByClient: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('projects')
          .select('*')
          .eq('client_id', input.clientId)
          .eq('user_id', ctx.user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching projects:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch projects',
          });
        }

        // Transform database format to application format
        const projects: Project[] = (data || []).map(row => ({
          id: row.id,
          userId: row.user_id,
          clientId: row.client_id,
          name: row.name,
          description: row.description,
          status: row.status as Project['status'],
          budget: row.budget ? parseFloat(row.budget) : undefined,
          deadline: row.deadline ? new Date(row.deadline) : undefined,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        }));

        return projects;
      } catch (error) {
        console.error('Error in projects.listByClient:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('projects')
          .select('*')
          .eq('user_id', ctx.user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching projects:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch projects',
          });
        }

        // Transform database format to application format
        const projects: Project[] = (data || []).map(row => ({
          id: row.id,
          userId: row.user_id,
          clientId: row.client_id,
          name: row.name,
          description: row.description,
          status: row.status as Project['status'],
          budget: row.budget ? parseFloat(row.budget) : undefined,
          deadline: row.deadline ? new Date(row.deadline) : undefined,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        }));

        return projects;
      } catch (error) {
        console.error('Error in projects.list:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('projects')
          .select('*')
          .eq('id', input.id)
          .eq('user_id', ctx.user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Project not found',
            });
          }
          console.error('Error fetching project:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch project',
          });
        }

        const project: Project = {
          id: data.id,
          userId: data.user_id,
          clientId: data.client_id,
          name: data.name,
          description: data.description,
          status: data.status as Project['status'],
          budget: data.budget ? parseFloat(data.budget) : undefined,
          deadline: data.deadline ? new Date(data.deadline) : undefined,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };

        return project;
      } catch (error) {
        console.error('Error in projects.getById:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  create: protectedProcedure
    .input(projectSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify client belongs to user
        const { data: clientData, error: clientError } = await ctx.supabase
          .from('clients')
          .select('id')
          .eq('id', input.clientId)
          .eq('user_id', ctx.user.id)
          .single();

        if (clientError || !clientData) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid client ID or client not found',
          });
        }

        const { data, error } = await ctx.supabase
          .from('projects')
          .insert({
            user_id: ctx.user.id,
            client_id: input.clientId,
            name: input.name,
            description: input.description || null,
            status: input.status,
            budget: input.budget || null,
            deadline: input.deadline || null,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating project:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create project',
          });
        }

        const project: Project = {
          id: data.id,
          userId: data.user_id,
          clientId: data.client_id,
          name: data.name,
          description: data.description,
          status: data.status as Project['status'],
          budget: data.budget ? parseFloat(data.budget) : undefined,
          deadline: data.deadline ? new Date(data.deadline) : undefined,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };

        return project;
      } catch (error) {
        console.error('Error in projects.create:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  update: protectedProcedure
    .input(projectSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify client belongs to user if clientId is being changed
        const { data: clientData, error: clientError } = await ctx.supabase
          .from('clients')
          .select('id')
          .eq('id', input.clientId)
          .eq('user_id', ctx.user.id)
          .single();

        if (clientError || !clientData) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid client ID or client not found',
          });
        }

        const { data, error } = await ctx.supabase
          .from('projects')
          .update({
            client_id: input.clientId,
            name: input.name,
            description: input.description || null,
            status: input.status,
            budget: input.budget || null,
            deadline: input.deadline || null,
          })
          .eq('id', input.id)
          .eq('user_id', ctx.user.id)
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Project not found',
            });
          }
          console.error('Error updating project:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update project',
          });
        }

        const project: Project = {
          id: data.id,
          userId: data.user_id,
          clientId: data.client_id,
          name: data.name,
          description: data.description,
          status: data.status as Project['status'],
          budget: data.budget ? parseFloat(data.budget) : undefined,
          deadline: data.deadline ? new Date(data.deadline) : undefined,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };

        return project;
      } catch (error) {
        console.error('Error in projects.update:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { error } = await ctx.supabase
          .from('projects')
          .delete()
          .eq('id', input.id)
          .eq('user_id', ctx.user.id);

        if (error) {
          console.error('Error deleting project:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete project',
          });
        }

        return { success: true };
      } catch (error) {
        console.error('Error in projects.delete:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),
});

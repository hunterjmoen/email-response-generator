import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { projectSchema } from '@freelance-flow/shared';
import { TRPCError } from '@trpc/server';
import type { Project } from '@freelance-flow/shared';
import type { ProjectRow } from '../../types/database';
import { logError } from '../../utils/logger';

// Pagination schema for list queries
const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const projectRouter = router({
  listByClient: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const { data, error, count } = await ctx.supabase
          .from('projects')
          .select('*', { count: 'exact' })
          .eq('client_id', input.clientId)
          .eq('user_id', ctx.user.id)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) {
          logError(error, { context: 'Fetch projects' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch projects',
          });
        }

        // Transform database format to application format
        const projects: Project[] = ((data as ProjectRow[]) || []).map((row: ProjectRow) => ({
          id: row.id,
          userId: row.user_id,
          clientId: row.client_id,
          name: row.name,
          description: row.description ?? undefined,
          status: row.status as Project['status'],
          budget: row.budget ? parseFloat(String(row.budget)) : undefined,
          deadline: row.deadline ?? undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        return {
          projects,
          total: count || 0,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        logError(error, { context: 'List projects by client' });
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
    .input(paginationSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        const { limit, offset } = input || { limit: 50, offset: 0 };

        const { data, error, count } = await ctx.supabase
          .from('projects')
          .select('*', { count: 'exact' })
          .eq('user_id', ctx.user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          logError(error, { context: 'Fetch projects' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch projects',
          });
        }

        // Transform database format to application format
        const projects: Project[] = ((data as ProjectRow[]) || []).map((row: ProjectRow) => ({
          id: row.id,
          userId: row.user_id,
          clientId: row.client_id,
          name: row.name,
          description: row.description ?? undefined,
          status: row.status as Project['status'],
          budget: row.budget ? parseFloat(String(row.budget)) : undefined,
          deadline: row.deadline ?? undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        return {
          projects,
          total: count || 0,
          limit: input?.limit || 50,
          offset: input?.offset || 0,
        };
      } catch (error) {
        logError(error, { context: 'List projects' });
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
          logError(error, { context: 'Fetch project' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch project',
          });
        }

        const row = data as ProjectRow;
        const project: Project = {
          id: row.id,
          userId: row.user_id,
          clientId: row.client_id,
          name: row.name,
          description: row.description ?? undefined,
          status: row.status as Project['status'],
          budget: row.budget ? parseFloat(String(row.budget)) : undefined,
          deadline: row.deadline ?? undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

        return project;
      } catch (error) {
        logError(error, { context: 'Get project by ID' });
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
            deadline: input.deadline ? new Date(input.deadline).toISOString() : null,
          })
          .select()
          .single();

        if (error) {
          logError(error, { context: 'Create project' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create project',
          });
        }

        const row = data as ProjectRow;
        const project: Project = {
          id: row.id,
          userId: row.user_id,
          clientId: row.client_id,
          name: row.name,
          description: row.description ?? undefined,
          status: row.status as Project['status'],
          budget: row.budget ? parseFloat(String(row.budget)) : undefined,
          deadline: row.deadline ?? undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

        return project;
      } catch (error) {
        logError(error, { context: 'Create project' });
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
            deadline: input.deadline ? new Date(input.deadline).toISOString() : null,
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
          logError(error, { context: 'Update project' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update project',
          });
        }

        const row = data as ProjectRow;
        const project: Project = {
          id: row.id,
          userId: row.user_id,
          clientId: row.client_id,
          name: row.name,
          description: row.description ?? undefined,
          status: row.status as Project['status'],
          budget: row.budget ? parseFloat(String(row.budget)) : undefined,
          deadline: row.deadline ?? undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

        return project;
      } catch (error) {
        logError(error, { context: 'Update project' });
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
          logError(error, { context: 'Delete project' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete project',
          });
        }

        return { success: true };
      } catch (error) {
        logError(error, { context: 'Delete project' });
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

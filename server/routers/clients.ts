import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { clientSchema } from '@freelance-flow/shared';
import { TRPCError } from '@trpc/server';
import type { Client } from '@freelance-flow/shared';

export const clientRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('clients')
          .select('*, projects(count)')
          .eq('user_id', ctx.user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching clients:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch clients',
          });
        }

        // Transform database format to application format
        const clients = (data || []).map(row => ({
          id: row.id,
          userId: row.user_id,
          name: row.name,
          email: row.email,
          company: row.company,
          phone: row.phone,
          website: row.website,
          notes: row.notes,
          relationshipStage: row.relationship_stage as Client['relationshipStage'],
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          projectCount: row.projects?.[0]?.count || 0,
        }));

        return clients;
      } catch (error) {
        console.error('Error in clients.list:', error);
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
          .from('clients')
          .select('*')
          .eq('id', input.id)
          .eq('user_id', ctx.user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Client not found',
            });
          }
          console.error('Error fetching client:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch client',
          });
        }

        const client: Client = {
          id: data.id,
          userId: data.user_id,
          name: data.name,
          email: data.email,
          company: data.company,
          phone: data.phone,
          website: data.website,
          notes: data.notes,
          relationshipStage: data.relationship_stage as Client['relationshipStage'],
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };

        return client;
      } catch (error) {
        console.error('Error in clients.getById:', error);
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
    .input(clientSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('clients')
          .insert({
            user_id: ctx.user.id,
            name: input.name,
            email: input.email || null,
            company: input.company || null,
            phone: input.phone || null,
            website: input.website || null,
            notes: input.notes || null,
            relationship_stage: input.relationshipStage,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating client:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create client',
          });
        }

        const client: Client = {
          id: data.id,
          userId: data.user_id,
          name: data.name,
          email: data.email,
          company: data.company,
          phone: data.phone,
          website: data.website,
          notes: data.notes,
          relationshipStage: data.relationship_stage as Client['relationshipStage'],
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };

        return client;
      } catch (error) {
        console.error('Error in clients.create:', error);
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
    .input(clientSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('clients')
          .update({
            name: input.name,
            email: input.email || null,
            company: input.company || null,
            phone: input.phone || null,
            website: input.website || null,
            notes: input.notes || null,
            relationship_stage: input.relationshipStage,
          })
          .eq('id', input.id)
          .eq('user_id', ctx.user.id)
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Client not found',
            });
          }
          console.error('Error updating client:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update client',
          });
        }

        const client: Client = {
          id: data.id,
          userId: data.user_id,
          name: data.name,
          email: data.email,
          company: data.company,
          phone: data.phone,
          website: data.website,
          notes: data.notes,
          relationshipStage: data.relationship_stage as Client['relationshipStage'],
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };

        return client;
      } catch (error) {
        console.error('Error in clients.update:', error);
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
          .from('clients')
          .delete()
          .eq('id', input.id)
          .eq('user_id', ctx.user.id);

        if (error) {
          console.error('Error deleting client:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete client',
          });
        }

        return { success: true };
      } catch (error) {
        console.error('Error in clients.delete:', error);
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

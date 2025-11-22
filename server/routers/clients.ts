import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { clientSchema } from '@freelance-flow/shared';
import { TRPCError } from '@trpc/server';
import type { Client } from '@freelance-flow/shared';
import type { ClientRow } from '../../types/database';

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
        const clients = ((data as ClientRow[]) || []).map((row: ClientRow) => ({
          id: row.id,
          userId: row.user_id,
          name: row.name,
          email: row.email ?? undefined,
          company: row.company ?? undefined,
          phone: row.phone ?? undefined,
          website: row.website ?? undefined,
          notes: row.notes ?? undefined,
          relationshipStage: row.relationship_stage as Client['relationshipStage'],
          tags: row.tags || [],
          priority: (row.priority as Client['priority']) || 'medium',
          isArchived: row.is_archived || false,
          lastContactDate: row.last_contact_date ? new Date(row.last_contact_date) : undefined,
          healthScore: row.health_score || 50,
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

        const row = data as ClientRow;
        const client: Client = {
          id: row.id,
          userId: row.user_id,
          name: row.name,
          email: row.email ?? undefined,
          company: row.company ?? undefined,
          phone: row.phone ?? undefined,
          website: row.website ?? undefined,
          notes: row.notes ?? undefined,
          relationshipStage: row.relationship_stage as Client['relationshipStage'],
          tags: row.tags || [],
          priority: (row.priority as Client['priority']) || 'medium',
          isArchived: row.is_archived || false,
          lastContactDate: row.last_contact_date ? new Date(row.last_contact_date) : undefined,
          healthScore: row.health_score || 50,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
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
            tags: input.tags || [],
            priority: input.priority || 'medium',
            is_archived: input.isArchived || false,
            last_contact_date: input.lastContactDate ? new Date(input.lastContactDate).toISOString() : null,
            health_score: input.healthScore || 50,
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

        const row = data as ClientRow;
        const client: Client = {
          id: row.id,
          userId: row.user_id,
          name: row.name,
          email: row.email ?? undefined,
          company: row.company ?? undefined,
          phone: row.phone ?? undefined,
          website: row.website ?? undefined,
          notes: row.notes ?? undefined,
          relationshipStage: row.relationship_stage as Client['relationshipStage'],
          tags: row.tags || [],
          priority: (row.priority as Client['priority']) || 'medium',
          isArchived: row.is_archived || false,
          lastContactDate: row.last_contact_date ? new Date(row.last_contact_date) : undefined,
          healthScore: row.health_score || 50,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
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
            tags: input.tags !== undefined ? input.tags : undefined,
            priority: input.priority !== undefined ? input.priority : undefined,
            is_archived: input.isArchived !== undefined ? input.isArchived : undefined,
            last_contact_date: input.lastContactDate !== undefined ? (input.lastContactDate ? new Date(input.lastContactDate).toISOString() : null) : undefined,
            health_score: input.healthScore !== undefined ? input.healthScore : undefined,
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

        const row = data as ClientRow;
        const client: Client = {
          id: row.id,
          userId: row.user_id,
          name: row.name,
          email: row.email ?? undefined,
          company: row.company ?? undefined,
          phone: row.phone ?? undefined,
          website: row.website ?? undefined,
          notes: row.notes ?? undefined,
          relationshipStage: row.relationship_stage as Client['relationshipStage'],
          tags: row.tags || [],
          priority: (row.priority as Client['priority']) || 'medium',
          isArchived: row.is_archived || false,
          lastContactDate: row.last_contact_date ? new Date(row.last_contact_date) : undefined,
          healthScore: row.health_score || 50,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
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

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { error } = await ctx.supabase
          .from('clients')
          .delete()
          .in('id', input.ids)
          .eq('user_id', ctx.user.id);

        if (error) {
          console.error('Error bulk deleting clients:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete clients',
          });
        }

        return { success: true, count: input.ids.length };
      } catch (error) {
        console.error('Error in clients.bulkDelete:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  bulkUpdateStage: protectedProcedure
    .input(z.object({
      ids: z.array(z.string().uuid()),
      relationshipStage: z.enum(['new', 'established', 'difficult', 'long_term']),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { error } = await ctx.supabase
          .from('clients')
          .update({ relationship_stage: input.relationshipStage })
          .in('id', input.ids)
          .eq('user_id', ctx.user.id);

        if (error) {
          console.error('Error bulk updating stage:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update clients',
          });
        }

        return { success: true, count: input.ids.length };
      } catch (error) {
        console.error('Error in clients.bulkUpdateStage:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  bulkUpdateTags: protectedProcedure
    .input(z.object({
      ids: z.array(z.string().uuid()),
      tags: z.array(z.string()),
      mode: z.enum(['replace', 'add', 'remove']),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (input.mode === 'replace') {
          // Replace all tags
          const { error } = await ctx.supabase
            .from('clients')
            .update({ tags: input.tags })
            .in('id', input.ids)
            .eq('user_id', ctx.user.id);

          if (error) throw error;
        } else {
          // For add/remove, we need to fetch current tags first
          const { data: clients, error: fetchError } = await ctx.supabase
            .from('clients')
            .select('id, tags')
            .in('id', input.ids)
            .eq('user_id', ctx.user.id);

          if (fetchError) throw fetchError;

          // Update each client
          for (const client of (clients as Pick<ClientRow, 'id' | 'tags'>[]) || []) {
            let newTags = client.tags || [];
            if (input.mode === 'add') {
              const combinedTags = newTags.concat(input.tags);
              newTags = Array.from(new Set(combinedTags));
            } else if (input.mode === 'remove') {
              newTags = newTags.filter(tag => !input.tags.includes(tag));
            }

            const { error } = await ctx.supabase
              .from('clients')
              .update({ tags: newTags })
              .eq('id', client.id)
              .eq('user_id', ctx.user.id);

            if (error) throw error;
          }
        }

        return { success: true, count: input.ids.length };
      } catch (error) {
        console.error('Error in clients.bulkUpdateTags:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update tags',
        });
      }
    }),

  getAllTags: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('clients')
          .select('tags')
          .eq('user_id', ctx.user.id);

        if (error) throw error;

        // Flatten and deduplicate tags
        const allTags = new Set<string>();
        ((data as Pick<ClientRow, 'tags'>[]) || []).forEach((row: Pick<ClientRow, 'tags'>) => {
          (row.tags || []).forEach(tag => allTags.add(tag));
        });

        return Array.from(allTags).sort();
      } catch (error) {
        console.error('Error in clients.getAllTags:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch tags',
        });
      }
    }),
});

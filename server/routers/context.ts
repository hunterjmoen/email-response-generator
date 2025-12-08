import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { ContextDetectionService, type ContextDetectionResult } from '../../services/context-detection';

export const contextRouter = router({
  /**
   * Detect context from a client message
   * Returns predicted urgency, message type, sentiment, and scope creep detection
   */
  detect: protectedProcedure
    .input(
      z.object({
        message: z.string().min(10).max(2000),
      })
    )
    .mutation(async ({ input }): Promise<ContextDetectionResult> => {
      const { message } = input;

      try {
        const result = await ContextDetectionService.detectContext(message);
        return result;
      } catch (error: any) {
        console.error('Context detection error:', error);

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to detect context',
        });
      }
    }),
});

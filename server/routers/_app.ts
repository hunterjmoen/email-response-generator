import { router } from '../trpc';
import { authRouter } from './auth';
import { responsesRouter } from './responses';
import { stripeRouter } from './stripe';

export const appRouter = router({
  auth: authRouter,
  responses: responsesRouter,
  stripe: stripeRouter,
});

export type AppRouter = typeof appRouter;
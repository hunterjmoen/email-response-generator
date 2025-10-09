import { router } from '../trpc';
import { authRouter } from './auth';
import { responsesRouter } from './responses';
import { historyRouter } from './history';

export const appRouter = router({
  auth: authRouter,
  responses: responsesRouter,
  history: historyRouter,
});

export type AppRouter = typeof appRouter;
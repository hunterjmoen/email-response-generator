import { router } from '../trpc';
import { authRouter } from './auth';
import { responsesRouter } from './responses';
import { stripeRouter } from './stripe';
import { historyRouter } from './history';
import { clientRouter } from './clients';
import { projectRouter } from './projects';

export const appRouter = router({
  auth: authRouter,
  responses: responsesRouter,
  stripe: stripeRouter,
  history: historyRouter,
  clients: clientRouter,
  projects: projectRouter,
});

export type AppRouter = typeof appRouter;
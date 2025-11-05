import { router } from '../trpc';
import { authRouter } from './auth';
import { responsesRouter } from './responses';
import { stripeRouter } from './stripe';
import { historyRouter } from './history';
import { clientRouter } from './clients';
import { projectRouter } from './projects';
import { settingsRouter } from './settings';

export const appRouter = router({
  auth: authRouter,
  responses: responsesRouter,
  stripe: stripeRouter,
  history: historyRouter,
  clients: clientRouter,
  projects: projectRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
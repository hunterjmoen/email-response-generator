import { router } from '../trpc';
import { authRouter } from './auth';
import { responsesRouter } from './responses';
import { stripeRouter } from './stripe';
import { historyRouter } from './history';
import { clientRouter } from './clients';
import { projectRouter } from './projects';
import { settingsRouter } from './settings';
import { dashboardRouter } from './dashboard';
import { remindersRouter } from './reminders';
import { templatesRouter } from './templates';
import { feedbackRouter } from './feedback';
import { contextRouter } from './context';

export const appRouter = router({
  auth: authRouter,
  responses: responsesRouter,
  stripe: stripeRouter,
  history: historyRouter,
  clients: clientRouter,
  projects: projectRouter,
  settings: settingsRouter,
  dashboard: dashboardRouter,
  reminders: remindersRouter,
  templates: templatesRouter,
  feedback: feedbackRouter,
  context: contextRouter,
});

export type AppRouter = typeof appRouter;
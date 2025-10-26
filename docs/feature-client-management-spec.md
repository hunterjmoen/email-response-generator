# Implementation Spec: Client & Project Management

## 1. Overview

This document outlines the technical implementation plan for integrating Client and Project Management features into the FreelanceFlow application. The goal is to extend the app's functionality from a communication assistant to a more comprehensive freelance business hub, directly enhancing the core AI response generation workflow.

This feature will allow freelancers to:
- Add, view, edit, and delete their clients.
- Create, track, and manage projects associated with each client.
- Use this client/project data to automatically provide context for the AI response generator, making it faster and more powerful.

This plan adheres to the existing architecture, conventions, and technology stack (Next.js, tRPC, Supabase, TypeScript, Tailwind CSS) as defined in the `architecture.md` document.

## 2. Database Schema Changes (Supabase/PostgreSQL)

Two new tables, `clients` and `projects`, will be created. These will be managed via Supabase migrations.

### `clients` Table

This table stores information about the freelancer's clients.

```sql
-- Table for storing client information
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    company TEXT,
    notes TEXT,
    -- Denormalized from ResponseContext for easy access
    relationship_stage TEXT NOT NULL DEFAULT 'established' CHECK (relationship_stage IN ('new', 'established', 'difficult', 'long_term')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policy: Users can only manage their own clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access and manage their own clients" ON clients
    FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_clients_user_id ON clients USING btree (user_id);
```

### `projects` Table

This table stores information about projects, linked to both a user (freelancer) and a client.

```sql
-- Table for storing project information
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    -- Denormalized from ResponseContext for easy access
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('discovery', 'active', 'completion', 'maintenance', 'on_hold')),
    budget NUMERIC(10, 2),
    deadline DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policy: Users can only manage their own projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access and manage their own projects" ON projects
    FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects USING btree (user_id);
CREATE INDEX idx_projects_client_id ON projects USING btree (client_id);
```

## 3. Shared Types and Schemas

The following TypeScript interfaces and Zod schemas should be added to the `packages/shared/` directory.

### New Interfaces (`packages/shared/src/types/crm.ts`)

```typescript
export interface Client {
  id: string;
  userId: string;
  name: string;
  email?: string;
  company?: string;
  notes?: string;
  relationshipStage: 'new' | 'established' | 'difficult' | 'long_term';
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  clientId: string;
  name: string;
  description?: string;
  status: 'discovery' | 'active' | 'completion' | 'maintenance' | 'on_hold';
  budget?: number;
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### New Zod Schemas (`packages/shared/src/schemas/crmSchemas.ts`)

```typescript
import { z } from 'zod';

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal('')),
  company: z.string().optional(),
  notes: z.string().optional(),
  relationshipStage: z.enum(['new', 'established', 'difficult', 'long_term']),
});

export const projectSchema = z.object({
  clientId: z.string().uuid("Client is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(['discovery', 'active', 'completion', 'maintenance', 'on_hold']),
  budget: z.number().optional(),
  deadline: z.date().optional(),
});
```

## 4. API Specification (tRPC Routers)

New routers for `clients` and `projects` will be added to `apps/api/src/routers/`. These will be protected procedures, ensuring only authenticated users can access them.

### Client Router (`apps/api/src/routers/clients.ts`)

```typescript
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { clientSchema } from 'packages/shared/src/schemas/crmSchemas';

export const clientRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // Logic to fetch all clients for the current user from Supabase
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Logic to fetch a single client by ID
    }),
    
  create: protectedProcedure
    .input(clientSchema)
    .mutation(async ({ input, ctx }) => {
      // Logic to create a new client for the current user
    }),

  update: protectedProcedure
    .input(clientSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Logic to update a client
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Logic to delete a client
    }),
});
```

### Project Router (`apps/api/src/routers/projects.ts`)

```typescript
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { projectSchema } from 'packages/shared/src/schemas/crmSchemas';

export const projectRouter = router({
  listByClient: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Logic to fetch all projects for a specific client
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Logic to fetch a single project by ID
    }),

  create: protectedProcedure
    .input(projectSchema)
    .mutation(async ({ input, ctx }) => {
      // Logic to create a new project
    }),

  update: protectedProcedure
    .input(projectSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Logic to update a project
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Logic to delete a project
    }),
});
```

### Update Main Router (`apps/api/src/routers/_app.ts`)

The new routers must be merged into the main `appRouter`.

```typescript
// ... existing imports
import { clientRouter } from './clients';
import { projectRouter } from './projects';

export const appRouter = router({
  // ... existing routers (auth, user, responses, etc.)
  clients: clientRouter,
  projects: projectRouter,
});
```

## 5. Frontend Implementation

New pages and components will be created to provide a user interface for managing clients and projects.

### New Pages (`apps/web/src/pages/dashboard/`)

- **`clients.tsx`**: A new page to display a list of all clients. It should have a button to create a new client.
- **`clients/[id].tsx`**: A detail page for a single client. It will show the client's information and a list of their associated projects.
- **`projects.tsx`**: (Optional) A page to display all projects across all clients, perhaps with filtering and sorting.

### New Components (`apps/web/src/components/`)

Create new folders `apps/web/src/components/clients` and `apps/web/src/components/projects`.

- **`ClientList.tsx`**: Displays clients in a table or card layout. Each item links to `clients/[id]`.
- **`ClientForm.tsx`**: A form (potentially in a modal) for creating and editing a client. Uses the `clientSchema` for validation.
- **`ProjectList.tsx`**: Displays projects associated with a specific client on the `clients/[id]` page.
- **`ProjectForm.tsx`**: A form for creating and editing a project.

### Integration with Core Workflow

This is the most critical step for user value. The main response generation interface needs to be updated.

- **Modify `ContextSelectorComponent` (or equivalent):**
    1. Add a **"Client" dropdown**. This should be populated with the list of clients fetched from the `clients.list` tRPC procedure.
    2. Add a **"Project" dropdown**. This should be disabled until a client is selected. Once a client is selected, it should be populated with the projects for that client (fetched via `projects.listByClient`).
    3. **Update Context Automatically:** When a user selects a project from the dropdown, the `relationshipStage` (from the selected client) and `projectPhase` (from the selected project) context selectors should be **automatically updated**. The user can still override them manually if needed.

## 6. Implementation Steps

1.  **Database:** Create a new migration file in `packages/database/migrations/` with the SQL from section 2. Run the migration to update your local Supabase instance.
2.  **Shared Code:** Create the new type and schema files in `packages/shared/` as described in section 3.
3.  **Backend:** Implement the tRPC routers (`clients.ts`, `projects.ts`) in `apps/api/src/routers/` and update the main `appRouter`.
4.  **Frontend (CRUD):**
    - Create the new pages under `apps/web/src/pages/dashboard/`.
    - Build the reusable components (`ClientList`, `ClientForm`, etc.) in `apps/web/src/components/`.
    - Wire up the components to the tRPC procedures for data fetching and mutations.
5.  **Frontend (Integration):**
    - Modify the main response generation component to include the new Client and Project dropdowns.
    - Implement the logic to auto-populate the context selectors based on the dropdown selections.
6.  **Testing:** Add unit/integration tests for the new tRPC endpoints and Playwright E2E tests for the full user workflow (creating a client, creating a project, then using them to generate a response).

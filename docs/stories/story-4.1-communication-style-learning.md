# Story 4.1: Communication Style Learning Implementation Guide

## 1. Overview

**Goal:** Implement the "Communication Style Learning" feature, enabling the AI to analyze a user's successful past responses and adapt its generation style to match their unique voice, tone, and phrasing.

**Source PRD Epic:** [Epic 4: Personalization & Intelligence](docs/prd/epic-4-personalization-intelligence.md)

This guide provides a step-by-step technical implementation plan for an AI developer, grounded in the existing FreelanceFlow architecture (Next.js, tRPC, Supabase).

## 2. Implementation Steps

The implementation can be broken down into four main parts:
1.  **Data Collection:** Enhance the frontend and backend to capture user feedback.
2.  **Database Modification:** Update the database schema to store the learned style profile.
3.  **Style Analysis Service:** Create a backend service that analyzes user data and creates a style profile.
4.  **Integration with AI Generation:** Modify the response generation service to use the learned style profile.

---

### Step 1: Enhance Data Collection

The system needs to know which responses the user considers "good."

#### 1.1. Capture Explicit Feedback (Frontend)

-   **File:** `components/workflow/ResponseDisplay.tsx`
-   **Task:** Add a 1-5 star rating component to each generated response card.
-   **Action:** When a user rates a response, call a new tRPC mutation `history.rateResponse`.

#### 1.2. Capture Implicit Feedback (Frontend & Backend)

-   **File:** `components/workflow/ResponseDisplay.tsx`
-   **Task:** When a user clicks the "Copy" button on a response, this is a strong positive signal.
-   **Action:** Trigger a new tRPC mutation `history.markResponseAsCopied` which updates the `response_history` record.

#### 1.3. Create New tRPC Mutations (Backend)

-   **File:** `server/routers/history.ts`
-   **Task:** Create two new mutations.

```typescript
// In server/routers/history.ts

export const historyRouter = router({
  // ... existing procedures
  
  rateResponse: protectedProcedure
    .input(z.object({
      historyId: z.string().uuid(),
      responseId: z.string(), // ID of the specific response variant
      rating: z.number().min(1).max(5),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Find the response_history record by historyId.
      // 2. Find the specific response variant in the `generated_options` JSONB array.
      // 3. Update the rating for that variant.
      // 4. Save the updated record.
      // 5. Trigger the asynchronous style analysis if the rating is >= 4.
      //    (await triggerStyleAnalysis(ctx.user.id);)
      return { success: true };
    }),

  markResponseAsCopied: protectedProcedure
    .input(z.object({
      historyId: z.string().uuid(),
      responseId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Find the response_history record.
      // 2. Update a new field, e.g., `copiedResponseId` on the record.
      // 3. Trigger the asynchronous style analysis.
      //    (await triggerStyleAnalysis(ctx.user.id);)
      return { success: true };
    }),
});
```

---

### Step 2: Update Database Schema

The `users` table needs a place to store the learned profile, and the `response_history` table needs to track copied responses.

-   **File:** `database/migrations/005_add_style_learning.sql` (Create a new migration file)
-   **Task:** Add a `style_profile` column to `users` and a `copied_response_id` column to `response_history`.

```sql
-- Add a JSONB column to the users table to store the learned style profile.
ALTER TABLE public.users
ADD COLUMN style_profile JSONB;

-- Add a column to response_history to track which response was copied.
ALTER TABLE public.response_history
ADD COLUMN copied_response_id TEXT;

-- Add an index for faster lookup of high-quality responses for a user.
CREATE INDEX idx_response_history_high_rating
ON public.response_history (user_id)
WHERE (user_rating >= 4);
```

---

### Step 3: Create the Style Analysis Service

This is the core of the learning mechanism. It should run asynchronously to avoid blocking user requests. A Supabase Edge Function is a perfect fit for this.

#### 3.1. Create a Supabase Edge Function

-   **Directory:** `supabase/functions/analyze-style`
-   **Task:** Create a new Edge Function that will be triggered via a webhook.

```typescript
// supabase/functions/analyze-style/index.ts

import { createClient } from '@supabase/supabase-js'
import { OpenAI } from 'openai'

// Initialize Supabase and OpenAI clients using environment variables
const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

Deno.serve(async (req) => {
  const { userId } = await req.json();

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });
  }

  // 1. Fetch the user's top 10-20 most recent, highly-rated (>= 4 stars) or copied responses.
  const { data: history, error } = await supabaseAdmin
    .from('response_history')
    .select('selected_response_encrypted, copied_response_id, generated_options')
    .eq('user_id', userId)
    .or('user_rating.gte.4,copied_response_id.is.not.null')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !history || history.length < 5) { // Need a minimum number of samples
    return new Response(JSON.stringify({ message: 'Not enough data to analyze.' }), { status: 200 });
  }
  
  // NOTE: This assumes you have a way to decrypt 'selected_response_encrypted'.
  // You will need to replicate the decryption logic from `EncryptionService` here.
  const sampleTexts = history.map(h => {
      // Logic to get the content of the best response from the record
      // This is a placeholder for decryption and selection logic
      return h.selected_response_encrypted || '';
  }).filter(Boolean);


  // 2. Call OpenAI to perform the style analysis.
  const analysisPrompt = `
    Analyze the communication style from the following JSON array of text samples from a freelancer.
    Based on the samples, describe the freelancer's voice and tone.
    Your output MUST be a valid JSON object with the following keys:
    - "formality": (string) "casual", "neutral", or "formal".
    - "tone": (string) "friendly", "direct", "diplomatic", or "neutral".
    - "sentenceComplexity": (string) "simple", "moderate", or "complex".
    - "emojiUsage": (boolean) Does the user use emojis?
    - "commonPhrases": (string[]) An array of 3-5 common phrases or words the user prefers.
    - "structuralHabits": (string[]) An array of 2-3 observations about sentence structure, e.g., "Prefers starting sentences with conjunctions", "Uses bullet points for lists".
    - "summary": (string) A one-sentence summary of the overall style.

    Samples: ${JSON.stringify(sampleTexts)}
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'system', content: analysisPrompt }],
    response_format: { type: 'json_object' },
  });

  const styleProfile = JSON.parse(response.choices[0].message.content);

  // 3. Save the generated style profile to the user's record.
  await supabaseAdmin
    .from('users')
    .update({ style_profile: styleProfile })
    .eq('id', userId);

  return new Response(JSON.stringify({ success: true, profile: styleProfile }), { status: 200 });
});
```

#### 3.2. Triggering the Edge Function

Modify the `rateResponse` and `markResponseAsCopied` tRPC mutations in `server/routers/history.ts` to call this new function.

```typescript
// In server/routers/history.ts, inside the mutations

// Replace (await triggerStyleAnalysis(ctx.user.id);) with:
const supabase = createClient(serverConfig.supabaseUrl, serverConfig.supabaseAnonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
await supabase.functions.invoke('analyze-style', {
    body: { userId: ctx.user.id }
});
```

---

### Step 4: Integrate Learned Style into AI Generation

Now, use the `style_profile` when generating new responses.

-   **File:** `services/ai-response.ts`
-   **Task:** Modify the `generate` function to incorporate the learned style.

```typescript
// In services/ai-response.ts

// ... imports

export class AIResponseService {
  // ... constructor

  async generate(
    // ... existing params
    user: User // Pass the full user object, including the new style_profile
  ): Promise<AIResponse[]> {
    
    let styleInstructions = "Your goal is to be a helpful and professional assistant.";

    if (user.style_profile) {
      const profile = user.style_profile as any; // Cast to any to access dynamic keys
      styleInstructions = `
        You MUST adopt the following communication style, which has been learned from the user's past writing.
        This is not a suggestion, it is a requirement.
        - Overall Summary: ${profile.summary}
        - Formality: ${profile.formality}
        - Tone: ${profile.tone}
        - Sentence Complexity: ${profile.sentenceComplexity}
        - Common Phrases to use if appropriate: ${profile.commonPhrases.join(', ')}
        - Structural Habits to follow: ${profile.structuralHabits.join('. ')}
        - Emoji Usage: ${profile.emojiUsage ? 'Use emojis where appropriate.' : 'Do not use emojis.'}
      `;
    }

    const systemPrompt = `
      You are an AI assistant for a freelancer.
      ${styleInstructions}
      Generate 2-3 professional response options for the client message provided, based on the given context.
      Your output MUST be a valid JSON array of objects...
    `;

    // ... rest of the generation logic, using the new systemPrompt
  }
}
```

-   **File:** `server/routers/responses.ts`
-   **Task:** Fetch the full user object and pass it to the `AIResponseService`.

```typescript
// In server/routers/responses.ts

// ... inside the `responses.generate` mutation
const { data: user, error } = await ctx.supabase
  .from('users')
  .select('*')
  .eq('id', ctx.user.id)
  .single();

if (error || !user) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found.' });
}

const responses = await aiResponseService.generate(
  input.originalMessage,
  input.context,
  user // Pass the full user object
);
```

## 3. User Interface for Style Management

-   **Location:** `pages/settings/profile.tsx`
-   **Task:** Create a new section titled "Learned Communication Style".
-   **Functionality:**
    1.  Display the `summary` from the user's `style_profile`.
    2.  Show the key-value pairs from the `style_profile` JSON in a readable format.
    3.  Add a "Recalculate My Style" button that manually triggers the `analyze-style` Edge Function.
    4.  Add a "Reset My Style" button that clears the `style_profile` column for the user, reverting them to the default AI personality.

## 4. Conclusion

By following these steps, you will implement a robust communication style learning feature that:
-   Captures user feedback effectively.
-   Uses an asynchronous process to analyze style without impacting performance.
-   Stores a structured style profile in the database.
-   Integrates this profile directly into the AI response generation prompt.
-   Provides users with visibility and control over their learned style.

This implementation will significantly enhance the personalization of FreelanceFlow and is a critical component for driving long-term user retention and justifying the premium subscription.

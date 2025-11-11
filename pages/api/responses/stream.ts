import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { AIResponseStreamingService } from '../../../services/ai-response-streaming';
import { z } from 'zod';

// Create server-side Supabase client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Create regular Supabase client for JWT verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Validation schema
const StreamRequestSchema = z.object({
  originalMessage: z.string().min(10).max(2000),
  context: z.object({
    urgency: z.enum(['immediate', 'standard', 'non_urgent']),
    messageType: z.enum(['update', 'question', 'concern', 'deliverable', 'payment', 'scope_change']),
    relationshipStage: z.enum(['new', 'established', 'difficult', 'long_term']),
    projectPhase: z.enum(['discovery', 'active', 'completion', 'maintenance', 'on_hold']),
    clientName: z.string().optional(),
    userName: z.string().optional(),
    customNotes: z.string().optional(),
  }),
  refinementInstructions: z.string().optional(),
  previousResponses: z.array(z.string()).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication using the JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Stream API] No authorization header');
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const token = authHeader.substring(7);

    // Use regular supabase client to verify JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[Stream API] Auth error:', authError?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log('[Stream API] User authenticated:', user.id);

    // Validate request body
    const validationResult = StreamRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors
      });
    }

    const { originalMessage, context, refinementInstructions, previousResponses } = validationResult.data;

    // Check user's usage limits
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('usage_count, monthly_limit, tier')
      .eq('user_id', user.id)
      .single();

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscription.usage_count >= subscription.monthly_limit) {
      return res.status(403).json({ error: 'Monthly usage limit exceeded' });
    }

    // Fetch user profile for style learning
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('first_name, style_profile')
      .eq('id', user.id)
      .single();

    // Enrich context with user's name
    const enrichedContext = {
      ...context,
      userName: userProfile?.first_name,
    };

    // Set up Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for Nginx

    // Track accumulated responses for saving to history
    const accumulatedResponses: Array<{
      content: string;
      tone: string;
      length: string;
      confidence: number;
      reasoning: string;
    }> = [];
    let currentResponseIndex = -1;

    // Generate and stream responses
    const styleProfile = subscription.tier === 'premium' ? userProfile?.style_profile : undefined;
    const stream = AIResponseStreamingService.generateResponsesStream(
      originalMessage,
      enrichedContext,
      styleProfile,
      refinementInstructions,
      previousResponses
    );

    for await (const chunk of stream) {
      // Send chunk to client
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);

      // Track responses for history
      if (chunk.type === 'start' && chunk.responseIndex !== undefined) {
        currentResponseIndex = chunk.responseIndex;
        accumulatedResponses[currentResponseIndex] = {
          content: '',
          tone: '',
          length: '',
          confidence: 0.8,
          reasoning: '',
        };
      } else if (chunk.type === 'content' && chunk.responseIndex !== undefined && chunk.content) {
        accumulatedResponses[chunk.responseIndex].content += chunk.content;
      } else if (chunk.type === 'complete' && chunk.responseIndex !== undefined && chunk.metadata) {
        Object.assign(accumulatedResponses[chunk.responseIndex], chunk.metadata);
      }
    }

    // Save to response_history after all streaming is complete
    try {
      const { data: responseHistory } = await supabaseAdmin
        .from('response_history')
        .insert({
          user_id: user.id,
          original_message: originalMessage,
          context: enrichedContext,
          generated_options: accumulatedResponses,
          openai_model: process.env.OPENAI_MODEL || 'gpt-4',
          confidence_score: accumulatedResponses.reduce((sum, r) => sum + r.confidence, 0) / accumulatedResponses.length,
        })
        .select()
        .single();

      // Update usage count
      await supabaseAdmin
        .from('subscriptions')
        .update({ usage_count: subscription.usage_count + 1 })
        .eq('user_id', user.id);

      // Send completion message with history ID
      res.write(`data: ${JSON.stringify({
        type: 'done',
        historyId: responseHistory?.id,
      })}\n\n`);
    } catch (dbError) {
      console.error('Error saving to history:', dbError);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: 'Failed to save response history',
      })}\n\n`);
    }

    res.end();
  } catch (error: any) {
    console.error('Streaming error:', error);

    // Send error event
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message || 'An error occurred during streaming',
    })}\n\n`);

    res.end();
  }
}

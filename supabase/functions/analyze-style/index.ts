// @ts-ignore: Deno types
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore: Deno types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StyleProfile {
  formality: 'casual' | 'neutral' | 'formal';
  tone: 'friendly' | 'direct' | 'diplomatic' | 'neutral';
  sentenceComplexity: 'simple' | 'moderate' | 'complex';
  emojiUsage: boolean;
  commonPhrases: string[];
  structuralHabits: string[];
  summary: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Fetch the user's top 10-20 most recent, highly-rated (>= 4 stars) or copied responses
    const { data: history, error: historyError } = await supabaseAdmin
      .from('response_history')
      .select('selected_response_encrypted, copied_response_id, generated_options, selected_response')
      .eq('user_id', userId)
      .or('user_rating.gte.4,copied_response_id.is.not.null')
      .order('created_at', { ascending: false })
      .limit(20);

    if (historyError) {
      console.error('Error fetching history:', historyError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch response history' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!history || history.length < 5) {
      return new Response(
        JSON.stringify({ message: 'Not enough data to analyze. Need at least 5 high-quality responses.' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract sample texts from the history
    // For now, we'll use the selected_response field (unencrypted version)
    // In production, you'd decrypt the encrypted version
    const sampleTexts = history
      .map((h) => {
        // Try to get the selected response content
        if (h.selected_response !== null && h.selected_response !== undefined) {
          const options = h.generated_options as any[];
          if (options && options[h.selected_response]) {
            return options[h.selected_response].content;
          }
        }
        // Fallback: try to get the first option
        const options = h.generated_options as any[];
        if (options && options.length > 0) {
          return options[0].content;
        }
        return null;
      })
      .filter((text): text is string => text !== null && text.length > 0);

    if (sampleTexts.length < 5) {
      return new Response(
        JSON.stringify({ message: 'Not enough valid response samples to analyze.' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Call OpenAI to perform the style analysis
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
    `.trim();

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert communication analyst. Analyze writing samples and extract style patterns.',
          },
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze style with OpenAI' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const styleProfile: StyleProfile = JSON.parse(openaiData.choices[0].message.content);

    // Save the generated style profile to the user's record
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ style_profile: styleProfile })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user style profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save style profile' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, profile: styleProfile }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Unexpected error in analyze-style function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Follow this setup guide to integrate the Deno runtime:
// https://deno.land/manual/getting_started/setup_your_environment
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Subscription {
  user_id: string;
  tier: string;
  usage_count: number;
  monthly_limit: number;
  usage_reset_date: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const now = new Date()
    console.log(`[Reset Usage] Running monthly usage reset at ${now.toISOString()}`)

    // Find all subscriptions where usage_reset_date has passed
    const { data: subscriptionsToReset, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, tier, usage_count, monthly_limit, usage_reset_date')
      .lte('usage_reset_date', now.toISOString())

    if (fetchError) {
      console.error('[Reset Usage] Error fetching subscriptions:', fetchError)
      throw fetchError
    }

    if (!subscriptionsToReset || subscriptionsToReset.length === 0) {
      console.log('[Reset Usage] No subscriptions need reset at this time')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No subscriptions need reset',
          resetCount: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.log(`[Reset Usage] Found ${subscriptionsToReset.length} subscriptions to reset`)

    // Calculate next reset date (first day of next month)
    const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // Reset usage count for each subscription
    const resetPromises = subscriptionsToReset.map((subscription: Subscription) => {
      return supabaseAdmin
        .from('subscriptions')
        .update({
          usage_count: 0,
          usage_reset_date: nextResetDate.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('user_id', subscription.user_id)
    })

    const results = await Promise.allSettled(resetPromises)

    // Count successful resets
    const successCount = results.filter((r) => r.status === 'fulfilled').length
    const failureCount = results.filter((r) => r.status === 'rejected').length

    // Log failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `[Reset Usage] Failed to reset subscription for user ${subscriptionsToReset[index].user_id}:`,
          result.reason
        )
      }
    })

    console.log(
      `[Reset Usage] Reset complete. Success: ${successCount}, Failures: ${failureCount}`
    )

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Monthly usage reset completed',
        resetCount: successCount,
        failureCount,
        nextResetDate: nextResetDate.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[Reset Usage] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

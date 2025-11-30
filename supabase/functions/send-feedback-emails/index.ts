// Supabase Edge Function for sending milestone feedback emails (7-day and 30-day)
// This should be scheduled to run daily via Supabase cron
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserData {
  id: string;
  email: string;
  first_name: string;
  preferences: { emailNotifications?: boolean } | null;
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'FreelanceFlow <noreply@freelanceflow.app>'
    const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://freelanceflow.app'

    if (!resendApiKey) {
      console.log('[Feedback Emails] RESEND_API_KEY not configured, skipping')
      return new Response(
        JSON.stringify({ success: true, message: 'Email not configured', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const now = new Date()
    console.log(`[Feedback Emails] Running at ${now.toISOString()}`)

    // Calculate date ranges for 7-day and 30-day milestones
    const day7Date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const day7Start = day7Date.toISOString().split('T')[0]
    const day7End = new Date(day7Date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const day30Date = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const day30Start = day30Date.toISOString().split('T')[0]
    const day30End = new Date(day30Date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    let totalSent = 0
    let totalSkipped = 0

    // Process 7-day milestone users
    const { data: day7Users } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, preferences, created_at')
      .gte('created_at', day7Start)
      .lt('created_at', day7End)

    console.log(`[Feedback Emails] Found ${day7Users?.length || 0} users at 7-day milestone`)

    for (const user of day7Users || []) {
      const result = await sendMilestoneEmail(supabaseAdmin, resendApiKey, fromEmail, appUrl, user as UserData, 'day_7')
      if (result.sent) totalSent++
      else totalSkipped++
    }

    // Process 30-day milestone users
    const { data: day30Users } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, preferences, created_at')
      .gte('created_at', day30Start)
      .lt('created_at', day30End)

    console.log(`[Feedback Emails] Found ${day30Users?.length || 0} users at 30-day milestone`)

    for (const user of day30Users || []) {
      const result = await sendMilestoneEmail(supabaseAdmin, resendApiKey, fromEmail, appUrl, user as UserData, 'day_30')
      if (result.sent) totalSent++
      else totalSkipped++
    }

    console.log(`[Feedback Emails] Complete. Sent: ${totalSent}, Skipped: ${totalSkipped}`)

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        skipped: totalSkipped,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Feedback Emails] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function sendMilestoneEmail(
  supabase: any,
  resendApiKey: string,
  fromEmail: string,
  appUrl: string,
  user: UserData,
  emailType: 'day_7' | 'day_30'
): Promise<{ sent: boolean }> {
  try {
    // Check email preferences
    if (user.preferences?.emailNotifications === false) {
      console.log(`[Feedback Emails] User ${user.id} has notifications disabled, skipping`)
      return { sent: false }
    }

    // Check if already sent
    const { data: existing } = await supabase
      .from('feedback_email_log')
      .select('id')
      .eq('user_id', user.id)
      .eq('email_type', emailType)
      .single()

    if (existing) {
      console.log(`[Feedback Emails] ${emailType} email already sent to user ${user.id}, skipping`)
      return { sent: false }
    }

    // Generate email content
    const milestoneText = emailType === 'day_7' ? 'one week' : 'one month'
    const emoji = emailType === 'day_7' ? '🎉' : '🚀'
    const feedbackUrl = `${appUrl}/dashboard?feedback=true`

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: user.email,
        subject: `${emoji} You've been using FreelanceFlow for ${milestoneText}!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #111827;">Hi ${user.first_name || 'there'},</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              You've been using FreelanceFlow for <strong>${milestoneText}</strong> now! ${emoji}
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              We'd love to hear what you think. What's working well? What could be better?
            </p>
            <p style="margin: 32px 0; text-align: center;">
              <a href="${feedbackUrl}" style="background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
                Share Your Thoughts
              </a>
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              Your feedback directly shapes our roadmap. Every suggestion helps us build a better tool for freelancers.
            </p>
            <p style="color: #4b5563; line-height: 1.6;">Thanks for being part of FreelanceFlow!</p>
            <p style="color: #6b7280; margin-top: 32px; font-size: 14px;">- The FreelanceFlow Team</p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Feedback Emails] Resend error for user ${user.id}:`, errorText)
      return { sent: false }
    }

    // Log sent email
    await supabase
      .from('feedback_email_log')
      .insert({ user_id: user.id, email_type: emailType })

    console.log(`[Feedback Emails] Sent ${emailType} email to user ${user.id}`)
    return { sent: true }
  } catch (error) {
    console.error(`[Feedback Emails] Error sending to user ${user.id}:`, error)
    return { sent: false }
  }
}

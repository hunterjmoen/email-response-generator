import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not defined - email functionality will be disabled');
}

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Owner email for feedback notifications
export const FEEDBACK_RECIPIENT_EMAIL = process.env.FEEDBACK_RECIPIENT_EMAIL || 'feedback@freelanceflow.app';

// From email for sending
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'FreelanceFlow <noreply@freelanceflow.app>';

// Helper to check if email is configured
export function isEmailConfigured(): boolean {
  return resend !== null;
}

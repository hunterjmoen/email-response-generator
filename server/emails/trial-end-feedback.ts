export interface TrialEndFeedbackProps {
  userName: string;
  feedbackUrl: string;
}

export function getTrialEndFeedbackEmail(props: TrialEndFeedbackProps): {
  subject: string;
  html: string;
} {
  return {
    subject: 'How was your FreelanceFlow trial?',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #111827;">Hi ${props.userName},</h2>

        <p style="color: #4b5563; line-height: 1.6;">
          Your FreelanceFlow trial has ended. We hope you found it helpful for managing your freelance client communications!
        </p>

        <p style="color: #4b5563; line-height: 1.6;">
          We'd love to hear about your experience. Your feedback helps us improve FreelanceFlow for freelancers like you.
        </p>

        <p style="margin: 32px 0; text-align: center;">
          <a href="${props.feedbackUrl}" style="background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
            Share Your Feedback
          </a>
        </p>

        <p style="color: #4b5563; line-height: 1.6;">
          Questions or need help? Just reply to this email.
        </p>

        <p style="color: #4b5563; line-height: 1.6;">
          Thanks for trying FreelanceFlow!
        </p>

        <p style="color: #6b7280; margin-top: 32px; font-size: 14px;">
          - The FreelanceFlow Team
        </p>
      </div>
    `,
  };
}

export interface MilestoneFeedbackProps {
  userName: string;
  milestone: 'day_7' | 'day_30';
  feedbackUrl: string;
}

export function getMilestoneFeedbackEmail(props: MilestoneFeedbackProps): {
  subject: string;
  html: string;
} {
  const milestoneText = props.milestone === 'day_7' ? 'one week' : 'one month';
  const emoji = props.milestone === 'day_7' ? '🎉' : '🚀';

  return {
    subject: `${emoji} You've been using FreelanceFlow for ${milestoneText}!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #111827;">Hi ${props.userName},</h2>

        <p style="color: #4b5563; line-height: 1.6;">
          You've been using FreelanceFlow for <strong>${milestoneText}</strong> now! ${emoji}
        </p>

        <p style="color: #4b5563; line-height: 1.6;">
          We'd love to hear what you think. What's working well? What could be better?
        </p>

        <p style="margin: 32px 0; text-align: center;">
          <a href="${props.feedbackUrl}" style="background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
            Share Your Thoughts
          </a>
        </p>

        <p style="color: #4b5563; line-height: 1.6;">
          Your feedback directly shapes our roadmap. Every suggestion helps us build a better tool for freelancers.
        </p>

        <p style="color: #4b5563; line-height: 1.6;">
          Thanks for being part of FreelanceFlow!
        </p>

        <p style="color: #6b7280; margin-top: 32px; font-size: 14px;">
          - The FreelanceFlow Team
        </p>
      </div>
    `,
  };
}

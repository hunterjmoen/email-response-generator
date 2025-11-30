export interface FeedbackNotificationProps {
  userEmail: string;
  userName: string;
  category: string | undefined;
  rating: number | undefined;
  message: string;
  pageUrl: string | undefined;
  subscriptionTier: string;
  submittedAt: string;
}

export function getFeedbackNotificationEmail(props: FeedbackNotificationProps): {
  subject: string;
  html: string;
} {
  const categoryLabel = props.category
    ? props.category.charAt(0).toUpperCase() + props.category.slice(1)
    : 'General';

  const ratingDisplay = props.rating
    ? `${'★'.repeat(props.rating)}${'☆'.repeat(5 - props.rating)}`
    : 'Not provided';

  return {
    subject: `[Feedback] ${categoryLabel} from ${props.userName || props.userEmail}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #111827; margin-bottom: 20px;">New Feedback Received</h2>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 100px;">From:</td>
            <td style="padding: 8px 0; color: #111827;">${props.userName} (${props.userEmail})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Category:</td>
            <td style="padding: 8px 0; color: #111827;">${categoryLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Rating:</td>
            <td style="padding: 8px 0; color: #f59e0b; font-size: 18px;">${ratingDisplay}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Tier:</td>
            <td style="padding: 8px 0; color: #111827;">${props.subscriptionTier}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Page:</td>
            <td style="padding: 8px 0; color: #111827;">${props.pageUrl || 'Not specified'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Submitted:</td>
            <td style="padding: 8px 0; color: #111827;">${props.submittedAt}</td>
          </tr>
        </table>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

        <h3 style="color: #111827; margin-bottom: 12px;">Message:</h3>
        <div style="background: #f9fafb; padding: 16px; border-left: 4px solid #10b981; border-radius: 4px;">
          ${props.message.replace(/\n/g, '<br>')}
        </div>
      </div>
    `,
  };
}

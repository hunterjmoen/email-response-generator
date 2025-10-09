/**
 * Stripe utility functions for client-side usage
 */

/**
 * Format amount from cents to dollars
 */
export function formatAmount(amountInCents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amountInCents / 100);
}

/**
 * Format subscription interval for display
 */
export function formatInterval(interval: string, intervalCount = 1): string {
  if (intervalCount > 1) {
    return `every ${intervalCount} ${interval}s`;
  }
  return `per ${interval}`;
}

/**
 * Get subscription status color for UI
 */
export function getSubscriptionStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    active: 'green',
    trialing: 'blue',
    past_due: 'yellow',
    canceled: 'red',
    unpaid: 'red',
    incomplete: 'orange',
    incomplete_expired: 'red',
  };

  return statusColors[status] || 'gray';
}

/**
 * Get subscription status label
 */
export function getSubscriptionStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past Due',
    canceled: 'Canceled',
    unpaid: 'Unpaid',
    incomplete: 'Incomplete',
    incomplete_expired: 'Expired',
  };

  return statusLabels[status] || status;
}

/**
 * Check if subscription is active or in trial
 */
export function isSubscriptionActive(status: string): boolean {
  return status === 'active' || status === 'trialing';
}

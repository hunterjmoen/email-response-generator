/**
 * Change Order Types
 * Used for tracking scope changes and generating pricing responses
 */

export interface ChangeOrderLineItem {
  id: string;
  description: string;
  hours: number;
  rate: number;
  amount: number; // computed: hours * rate
}

export type ChangeOrderStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

export interface ChangeOrder {
  id: string;
  userId: string;
  clientId?: string;
  projectId?: string;
  responseHistoryId?: string;

  title: string;
  description?: string;
  lineItems: ChangeOrderLineItem[];
  subtotal: number;
  additionalTimelineDays: number;

  status: ChangeOrderStatus;

  responseText?: string;
  originalRequest?: string;
  detectedPhrases?: string[];

  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  respondedAt?: string;
}

export interface CreateChangeOrderInput {
  clientId?: string;
  projectId?: string;
  title: string;
  description?: string;
  lineItems: Omit<ChangeOrderLineItem, 'id' | 'amount'>[];
  additionalTimelineDays?: number;
  originalRequest?: string;
  detectedPhrases?: string[];
}

export interface UpdateChangeOrderInput {
  id: string;
  title?: string;
  description?: string;
  lineItems?: Omit<ChangeOrderLineItem, 'id' | 'amount'>[];
  additionalTimelineDays?: number;
  status?: ChangeOrderStatus;
}

export interface GenerateBoundaryResponseInput {
  changeOrderId: string;
  originalMessage: string;
  clientId?: string;
}

/**
 * Jobs-to-be-Done Mode
 * The three primary actions users can take in the generate workflow
 */
export type JTBDMode = 'reply_fast' | 'protect_scope' | 'move_forward';

export const JTBD_MODE_LABELS: Record<JTBDMode, string> = {
  reply_fast: 'Reply Fast',
  protect_scope: 'Protect Scope',
  move_forward: 'Move Forward',
};

export const JTBD_MODE_DESCRIPTIONS: Record<JTBDMode, string> = {
  reply_fast: 'Quick professional response',
  protect_scope: 'Set boundaries + create change order',
  move_forward: 'Confirm next steps & timeline',
};

import { type ResponseContext } from '@freelance-flow/shared';

export interface MessageTemplate {
  id: string;
  category: 'project' | 'payment' | 'scope' | 'communication' | 'referral';
  title: string;
  description: string;
  exampleMessage: string;
  suggestedContext: ResponseContext;
  icon: string;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'decline-project',
    category: 'project',
    title: 'Decline Project Politely',
    description: 'Professionally turn down a project you can\'t take on',
    exampleMessage: 'Hi! I received your project proposal for the website redesign. I appreciate you thinking of me for this work. However, my schedule is currently at capacity for the next 2 months. I don\'t want to commit to something I can\'t deliver with the quality you deserve.',
    suggestedContext: {
      urgency: 'standard',
      messageType: 'question',
      relationshipStage: 'new',
      projectPhase: 'discovery',
    },
    icon: '🚫',
  },
  {
    id: 'deadline-extension',
    category: 'project',
    title: 'Request Deadline Extension',
    description: 'Ask for more time to complete work professionally',
    exampleMessage: 'I wanted to give you an update on the project timeline. I\'ve run into some unexpected technical challenges with the database integration that need additional time to resolve properly. Can we extend the deadline by 3 days to ensure everything is thoroughly tested?',
    suggestedContext: {
      urgency: 'immediate',
      messageType: 'concern',
      relationshipStage: 'established',
      projectPhase: 'active',
    },
    icon: '⏰',
  },
  {
    id: 'payment-follow-up',
    category: 'payment',
    title: 'Follow Up on Overdue Payment',
    description: 'Remind client about unpaid invoice tactfully',
    exampleMessage: 'I hope this email finds you well. I wanted to touch base regarding Invoice #1234 that was due on March 15th. I haven\'t received payment yet and wanted to make sure you received the invoice. Please let me know if you have any questions or if there are any issues I should be aware of.',
    suggestedContext: {
      urgency: 'standard',
      messageType: 'payment',
      relationshipStage: 'established',
      projectPhase: 'completion',
    },
    icon: '💰',
  },
  {
    id: 'payment-initial',
    category: 'payment',
    title: 'Request Initial Payment',
    description: 'Ask for deposit or first payment professionally',
    exampleMessage: 'Thanks for approving the project proposal! Before I begin work, I require a 50% deposit ($2,500) as outlined in the contract. Once I receive this, I\'ll start immediately and you can expect the first draft by next Friday. I accept payments via bank transfer or PayPal.',
    suggestedContext: {
      urgency: 'standard',
      messageType: 'payment',
      relationshipStage: 'new',
      projectPhase: 'discovery',
    },
    icon: '💳',
  },
  {
    id: 'scope-change',
    category: 'scope',
    title: 'Discuss Scope Change',
    description: 'Address additional work requests professionally',
    exampleMessage: 'Thank you for the feedback on the current design. I notice the changes you\'re requesting (adding 5 additional pages and a contact form) weren\'t part of our original scope. I\'d be happy to add these features. They would require an additional 15 hours of work at my standard rate. Would you like me to send over a revised quote?',
    suggestedContext: {
      urgency: 'standard',
      messageType: 'scope_change',
      relationshipStage: 'established',
      projectPhase: 'active',
    },
    icon: '📋',
  },
  {
    id: 'project-update',
    category: 'communication',
    title: 'Send Project Update',
    description: 'Keep client informed about progress',
    exampleMessage: 'Quick update on the website project: I\'ve completed the homepage and about page designs. The contact form integration is in progress and should be done by Friday. Everything is on track for the March 30th launch date. Would you like to review what\'s been completed so far?',
    suggestedContext: {
      urgency: 'standard',
      messageType: 'update',
      relationshipStage: 'established',
      projectPhase: 'active',
    },
    icon: '📊',
  },
  {
    id: 'thank-referral',
    category: 'referral',
    title: 'Thank You for Referral',
    description: 'Show appreciation for a client referral',
    exampleMessage: 'I just got off a call with Sarah from XYZ Company, and she mentioned you recommended me for their redesign project. I wanted to thank you for thinking of me! I really appreciate you referring work my way. Your continued trust in my work means a lot.',
    suggestedContext: {
      urgency: 'non_urgent',
      messageType: 'question',
      relationshipStage: 'long_term',
      projectPhase: 'maintenance',
    },
    icon: '🙏',
  },
  {
    id: 'project-completion',
    category: 'project',
    title: 'Announce Project Completion',
    description: 'Notify client that work is finished',
    exampleMessage: 'Great news! I\'ve completed all the work on your website and it\'s ready for your final review. I\'ve tested everything thoroughly across different browsers and devices. The site is now live at the staging URL. Please take a look and let me know if you need any adjustments before we go live.',
    suggestedContext: {
      urgency: 'standard',
      messageType: 'deliverable',
      relationshipStage: 'established',
      projectPhase: 'completion',
    },
    icon: '✅',
  },
  {
    id: 'clarify-requirements',
    category: 'communication',
    title: 'Clarify Project Requirements',
    description: 'Ask for more details about unclear requirements',
    exampleMessage: 'Thanks for sending over the project brief. Before I can provide an accurate quote, I need to clarify a few things: 1) How many pages will the website need? 2) Do you have existing branding materials or will that need to be created? 3) What\'s your ideal timeline for launch? This will help me give you a precise estimate.',
    suggestedContext: {
      urgency: 'standard',
      messageType: 'question',
      relationshipStage: 'new',
      projectPhase: 'discovery',
    },
    icon: '❓',
  },
  {
    id: 'rate-increase',
    category: 'payment',
    title: 'Announce Rate Increase',
    description: 'Inform clients about updated pricing',
    exampleMessage: 'I wanted to give you advance notice that I\'ll be adjusting my rates starting next quarter. My hourly rate will increase from $100 to $120/hour, effective April 1st. Any projects we start before that date will be honored at the current rate. I really value our working relationship and wanted to give you plenty of notice.',
    suggestedContext: {
      urgency: 'non_urgent',
      messageType: 'update',
      relationshipStage: 'long_term',
      projectPhase: 'maintenance',
    },
    icon: '📈',
  },
  {
    id: 'delayed-response',
    category: 'communication',
    title: 'Apologize for Delayed Response',
    description: 'Professional apology for late reply',
    exampleMessage: 'My apologies for the delayed response to your email from last week. I was traveling for a conference and am now catching up on messages. I\'ve reviewed your questions about the mobile app design and I\'m happy to discuss them. Are you available for a quick call this week?',
    suggestedContext: {
      urgency: 'immediate',
      messageType: 'concern',
      relationshipStage: 'established',
      projectPhase: 'active',
    },
    icon: '⏱️',
  },
  {
    id: 'meeting-request',
    category: 'communication',
    title: 'Request Client Meeting',
    description: 'Schedule a call or meeting professionally',
    exampleMessage: 'I think it would be helpful to have a quick video call to discuss the design direction for the homepage. There are a few key decisions that would benefit from a real-time conversation rather than email back-and-forth. Do you have 30 minutes available this week? I\'m free Tuesday afternoon or Thursday morning.',
    suggestedContext: {
      urgency: 'standard',
      messageType: 'question',
      relationshipStage: 'established',
      projectPhase: 'active',
    },
    icon: '📅',
  },
];

export const getTemplatesByCategory = (category: MessageTemplate['category']) => {
  return MESSAGE_TEMPLATES.filter(t => t.category === category);
};

export const getTemplateById = (id: string) => {
  return MESSAGE_TEMPLATES.find(t => t.id === id);
};

export const TEMPLATE_CATEGORIES = [
  { id: 'project', label: 'Project Management', icon: '📁', count: MESSAGE_TEMPLATES.filter(t => t.category === 'project').length },
  { id: 'payment', label: 'Payment & Billing', icon: '💰', count: MESSAGE_TEMPLATES.filter(t => t.category === 'payment').length },
  { id: 'scope', label: 'Scope & Changes', icon: '📋', count: MESSAGE_TEMPLATES.filter(t => t.category === 'scope').length },
  { id: 'communication', label: 'Communication', icon: '💬', count: MESSAGE_TEMPLATES.filter(t => t.category === 'communication').length },
  { id: 'referral', label: 'Referrals & Thanks', icon: '🙏', count: MESSAGE_TEMPLATES.filter(t => t.category === 'referral').length },
] as const;

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
    description: 'Respond to project inquiry when you can\'t take it on',
    exampleMessage: 'Hi! I saw your portfolio and would love to work with you on a complete website redesign for my e-commerce business. The budget is $3,000 and I need it completed within 3 weeks. Are you available to take this on? Let me know if you\'re interested!',
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
    title: 'Client Pushing on Deadline',
    description: 'Respond when client needs deadline extension request',
    exampleMessage: 'Hey, just checking in on the website project. I know we originally said March 15th, but I\'m wondering if we can push that back a week or two? Some things came up on my end and I won\'t have all the content ready by then. Would that be possible?',
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
    title: 'Client Questioning Invoice',
    description: 'Handle client concerns about payment or invoice',
    exampleMessage: 'I received Invoice #1234 but wanted to clarify a few things before paying. I noticed you charged for 20 hours but we discussed 15 hours in our initial call. Can you help me understand the difference? Also, can we do Net 30 instead of immediate payment?',
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
    title: 'Client Wants to Start Without Deposit',
    description: 'Respond when client pushes back on upfront payment',
    exampleMessage: 'I\'m excited to get started on this project! I reviewed your proposal and everything looks great. However, I typically don\'t pay deposits until I see some initial work. Can we start with you doing the first design mockup, and then I\'ll send the 50% deposit once I see that? I\'ve been burned before with deposits.',
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
    title: 'Client Requesting Extra Features',
    description: 'Handle client scope creep professionally',
    exampleMessage: 'The designs are looking great! While we\'re at it, could you also add a blog section with about 5 custom post templates? And maybe an email newsletter signup form that integrates with Mailchimp? I think these would really complete the site. Should be pretty quick to add, right?',
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
    title: 'Client Asking for Status Update',
    description: 'Provide progress update when client asks',
    exampleMessage: 'Hey! Just wanted to check in on where we\'re at with the website. I haven\'t heard anything in a few days and wanted to make sure everything is on track. Can you give me an update on what\'s been completed and what\'s left? Thanks!',
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
    title: 'Client Provided a Referral',
    description: 'Thank client who sent you a referral',
    exampleMessage: 'Hey! I mentioned your name to my colleague Sarah at XYZ Company. She\'s looking for someone to redesign their website and I immediately thought of you. I gave her your email - hope that\'s okay! You did such great work on my site that I had to recommend you.',
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
    title: 'Client Asking When It\'ll Be Done',
    description: 'Respond when nearing completion',
    exampleMessage: 'Hi! We\'re getting close to the launch date and I\'m getting excited. Can you let me know when everything will be ready for me to review? Also, what\'s the process for final approval and going live? Want to make sure I don\'t miss anything.',
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
    title: 'Client with Vague Requirements',
    description: 'Clarify unclear project details',
    exampleMessage: 'I need a new website for my consulting business. Something modern and professional. I want it to look really good and convert visitors into leads. My budget is around $5,000. Can you help with this? When can you start?',
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
    title: 'Client Negotiating Rate',
    description: 'Handle rate negotiation professionally',
    exampleMessage: 'Thanks for the quote! Your work looks great but $120/hour is a bit higher than I was expecting. I was thinking more around $80-90/hour based on other quotes I\'ve gotten. Is there any flexibility on your rate? I have a lot of ongoing work if we can make the numbers work.',
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
    title: 'Client Complaining About Slow Response',
    description: 'Address client concern about communication',
    exampleMessage: 'I sent you an email 4 days ago with some important questions about the project timeline and haven\'t heard back. I\'m starting to get a bit worried since we have a tight deadline. Can you please respond when you get a chance? Thanks.',
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
    title: 'Client Requesting a Meeting',
    description: 'Respond to meeting request',
    exampleMessage: 'I have some questions about the design direction that I think would be easier to discuss over a call rather than email. Are you available for a 30-minute video chat sometime this week? I\'m flexible on timing - whatever works for your schedule.',
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

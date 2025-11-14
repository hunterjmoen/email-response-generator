export interface FAQItem {
  id: string;
  category: 'getting-started' | 'features' | 'billing' | 'troubleshooting';
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  // Getting Started
  {
    id: 'what-is-freelanceflow',
    category: 'getting-started',
    question: 'What is FreelanceFlow?',
    answer: 'FreelanceFlow is an AI-powered communication assistant designed specifically for freelancers and consultants. It helps you craft professional, personalized responses to clients using advanced AI technology. Whether you\'re responding to inquiries, following up on projects, or managing client relationships, FreelanceFlow streamlines your communication workflow.',
  },
  {
    id: 'how-to-get-started',
    category: 'getting-started',
    question: 'How do I get started with FreelanceFlow?',
    answer: 'Getting started is simple! Click the "Get Started" button to create your free account. Once logged in, you can immediately start generating AI-powered responses. Set up your profile with your professional details, add your clients for personalized communication, and begin crafting responses. The AI learns from your input to provide increasingly tailored suggestions.',
  },
  {
    id: 'free-trial',
    category: 'getting-started',
    question: 'Is there a free trial available?',
    answer: 'Yes! FreelanceFlow offers a free tier that includes 10 AI-generated responses per month. This allows you to test the platform and experience how AI can enhance your client communication without any commitment. You can upgrade to a paid plan anytime to access unlimited responses and premium features.',
  },

  // Features
  {
    id: 'ai-response-generation',
    category: 'features',
    question: 'How does the AI response generation work?',
    answer: 'Our AI analyzes the context you provide (such as the client\'s message, your relationship with them, and the tone you want to convey) to generate professional, personalized responses. Simply input the client\'s message or describe the situation, select your preferred tone and response type, and the AI will create a tailored response. You can then edit and customize the output before sending.',
  },
  {
    id: 'client-management',
    category: 'features',
    question: 'What is the client management feature?',
    answer: 'The client management system helps you organize and track all your client relationships in one place. You can store client details, project information, communication history, and important notes. This context helps the AI generate more personalized responses that reference specific projects, deadlines, or client preferences, making your communication more effective and professional.',
  },
  {
    id: 'response-history',
    category: 'features',
    question: 'Can I access my previous AI-generated responses?',
    answer: 'Absolutely! FreelanceFlow saves all your generated responses in the History section. You can view, search, and reuse previous responses, making it easy to maintain consistency in your communication. The history also helps you track your usage and serves as a reference for successful communication patterns.',
  },
  {
    id: 'tone-customization',
    category: 'features',
    question: 'Can I customize the tone of the AI responses?',
    answer: 'Yes! FreelanceFlow offers multiple tone options including professional, friendly, formal, casual, and more. You can select the appropriate tone for each response based on your relationship with the client and the context of the message. The AI adapts its language, word choice, and style to match your selected tone perfectly.',
  },
  {
    id: 'response-types',
    category: 'features',
    question: 'What types of responses can the AI generate?',
    answer: 'FreelanceFlow can generate a wide variety of professional communications including: project proposals, follow-up emails, status updates, meeting confirmations, invoice reminders, project completion messages, scope clarifications, timeline negotiations, and general inquiries. The AI understands common freelance scenarios and crafts appropriate responses for each situation.',
  },

  // Billing
  {
    id: 'pricing-plans',
    category: 'billing',
    question: 'What pricing plans are available?',
    answer: 'FreelanceFlow offers flexible pricing to suit different needs: a Free tier with 10 responses per month, a Professional plan at $10/month (or $96/year with 20% savings) with unlimited responses and priority support, and a Premium plan at $19/month (or $180/year) with everything in Professional plus premium AI models and dedicated account management. Visit our pricing page for detailed comparisons.',
  },
  {
    id: 'payment-methods',
    category: 'billing',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover) through our secure payment processor, Stripe. Your payment information is encrypted and never stored on our servers. You can update your payment method anytime in your account settings.',
  },
  {
    id: 'cancel-subscription',
    category: 'billing',
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can cancel your subscription at any time with no penalties or fees. Your access will continue until the end of your current billing period, and you won\'t be charged again. You can also downgrade to the free tier if you want to maintain limited access to the platform.',
  },
  {
    id: 'usage-limits',
    category: 'billing',
    question: 'What happens if I exceed my usage limit on the free plan?',
    answer: 'On the free plan, you\'re limited to 10 AI-generated responses per month. Once you reach this limit, you\'ll be prompted to upgrade to a paid plan to continue generating responses. Your account and data remain intact, and you\'ll regain access to response generation when your monthly limit resets or when you upgrade.',
  },

  // Troubleshooting
  {
    id: 'ai-not-generating',
    category: 'troubleshooting',
    question: 'What should I do if the AI isn\'t generating responses?',
    answer: 'If you\'re experiencing issues with response generation, try these steps: 1) Ensure you\'re logged in and haven\'t exceeded your monthly limit, 2) Check that you\'ve provided enough context for the AI to work with, 3) Try refreshing the page, 4) Clear your browser cache and cookies. If the issue persists, please contact our support team for assistance.',
  },
  {
    id: 'data-security',
    category: 'troubleshooting',
    question: 'Is my data secure and private?',
    answer: 'Yes, your data security is our top priority. All data is encrypted in transit and at rest. We use industry-standard security practices and never share your information with third parties. Your client data, generated responses, and account information are stored securely in our database with strict access controls. We\'re committed to protecting your privacy and maintaining the confidentiality of your business communications.',
  },
  {
    id: 'browser-compatibility',
    category: 'troubleshooting',
    question: 'Which browsers are supported?',
    answer: 'FreelanceFlow works best on modern browsers including the latest versions of Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated for the best experience. The platform is also mobile-responsive, so you can access it from your smartphone or tablet.',
  },
];

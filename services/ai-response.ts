import OpenAI from 'openai';
import { type AIResponseOptions, type ResponseContext, type GenerateResponseInput } from '@freelance-flow/shared';
import { type ToneFingerprint, ToneAnalysisService } from './tone-analysis';

// OpenAI Client Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

// Default model configuration
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4';

export class AIResponseService {
  /**
   * Generate AI response options based on client message and context
   */
  static async generateResponses(
    originalMessage: string,
    context: ResponseContext,
    styleProfile?: any,
    clientToneFingerprint?: ToneFingerprint
  ): Promise<AIResponseOptions[]> {
    try {
      const prompt = this.buildPrompt(originalMessage, context);

      const completion = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(styleProfile, clientToneFingerprint),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }

      const parsedResponse = JSON.parse(responseContent);
      return this.validateAndFormatResponse(parsedResponse);
    } catch (error: any) {
      console.error('AIResponseService: Error generating responses', error);

      // Handle specific OpenAI errors with better messaging
      if (error.status === 429) {
        throw new Error('OpenAI quota exceeded. Please check your billing at https://platform.openai.com/account/billing');
      }

      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please verify your OPENAI_API_KEY in .env.local');
      }

      throw new Error(`AI response generation failed: ${error.message}`);
    }
  }

  /**
   * Build the prompt based on context and message
   */
  private static buildPrompt(originalMessage: string, context: ResponseContext): string {
    const contextDescription = this.getContextDescription(context);
    const isScopeChange = context.messageType === 'scope_change';

    // Special instructions for scope creep situations
    const scopeCreepInstructions = isScopeChange ? `

IMPORTANT - SCOPE CREEP HANDLING:
This message contains a request for additional work outside the original scope. Generate responses that:
1. Acknowledge the request positively and show you understand what they're asking for
2. Professionally reframe the request as new/additional scope that requires discussion
3. Suggest next steps: scheduling a call, providing a quote, or discussing timeline implications
4. Maintain a helpful, collaborative tone while setting clear boundaries
5. NEVER agree to do the extra work for free or minimize its impact
6. If timeline concerns are mentioned, address how the additional work affects delivery

Response variations should include:
- One that offers to provide a quick estimate for the additional work
- One that suggests discussing the request in more detail before proceeding
- One that politely explains this is outside the current scope and offers alternatives
` : '';

    return `
Please generate 2-3 professional response options for the following client message:

CLIENT MESSAGE:
"${originalMessage}"

CONTEXT:
${contextDescription}
${scopeCreepInstructions}
Requirements:
- Generate exactly 2-3 response variations (brief, standard, detailed)
- Each response should be professional and appropriate for the context
- Vary the tone and length while maintaining professionalism
${context.clientName ? `- Start each response with "Hello ${context.clientName}," or "Hi ${context.clientName}," depending on the tone` : '- Use an appropriate greeting'}
${context.userName ? `- End each response with an appropriate sign-off using the name "${context.userName}" (e.g., "Best regards, ${context.userName}" or "Thanks, ${context.userName}" depending on tone)` : '- End with an appropriate professional sign-off'}
- Include confidence scores (0-1) for each response
- Provide brief reasoning for each response approach

Return responses in JSON format with the exact structure specified in the system prompt.
    `.trim();
  }

  /**
   * Get system prompt for consistent response formatting
   */
  private static getSystemPrompt(styleProfile?: any, clientToneFingerprint?: ToneFingerprint): string {
    let styleInstructions = '';

    if (styleProfile) {
      styleInstructions = `

IMPORTANT: You MUST adopt the following communication style, which has been learned from the user's past writing.
This is not a suggestion, it is a requirement. The user has a specific style and you must match it.

Communication Style Profile:
- Overall Summary: ${styleProfile.summary}
- Formality Level: ${styleProfile.formality}
- Tone: ${styleProfile.tone}
- Sentence Complexity: ${styleProfile.sentenceComplexity}
- Common Phrases to use when appropriate: ${styleProfile.commonPhrases?.join(', ') || 'None identified'}
- Structural Habits to follow: ${styleProfile.structuralHabits?.join('. ') || 'None identified'}
- Emoji Usage: ${styleProfile.emojiUsage ? 'Use emojis where appropriate.' : 'Do not use emojis.'}

When generating responses, carefully incorporate these style elements to match the user's natural writing voice.
      `.trim();
    }

    // TonePrint: Client tone mirroring instructions
    let clientToneInstructions = '';
    if (clientToneFingerprint && clientToneFingerprint.sampleCount >= 1) {
      const toneDescription = ToneAnalysisService.describeFingerprint(clientToneFingerprint);
      clientToneInstructions = `

CLIENT COMMUNICATION STYLE (TonePrint):
This client has a specific communication style that you should mirror to build rapport:
- Style: ${toneDescription}
- Formality: ${clientToneFingerprint.formality}
- Message length preference: ${clientToneFingerprint.brevity}
- Uses emojis: ${clientToneFingerprint.emojiUsage ? 'Yes - feel free to include appropriate emojis' : 'No - avoid emojis'}
- Greeting style: ${clientToneFingerprint.greetingStyle}
- Sign-off style: ${clientToneFingerprint.signOffStyle}
- Typical sentence length: ~${clientToneFingerprint.avgSentenceLength} words

Mirror this client's communication style in your responses while maintaining professionalism.
${clientToneFingerprint.formality === 'casual' ? 'Use a more relaxed, friendly tone.' : ''}
${clientToneFingerprint.formality === 'formal' ? 'Maintain a more formal, business-like tone.' : ''}
${clientToneFingerprint.brevity === 'terse' ? 'Keep responses concise and to the point.' : ''}
${clientToneFingerprint.brevity === 'verbose' ? 'Provide more detailed, thorough responses.' : ''}
      `.trim();
    }

    return `
You are an expert freelancer communication assistant. Generate professional email/message responses that help freelancers communicate effectively with their clients.
${styleInstructions}
${clientToneInstructions}

Always respond with valid JSON in this exact format:
{
  "responses": [
    {
      "content": "The actual response text",
      "tone": "professional|casual|formal",
      "length": "brief|standard|detailed",
      "confidence": 0.85,
      "reasoning": "Brief explanation of the approach"
    }
  ]
}

Guidelines:
- Generate 2-3 response variations with different lengths/approaches
- Keep responses professional but adjust formality based on context
- Be helpful, clear, and solution-oriented
- Consider the client relationship stage and project phase
- Handle urgent vs. non-urgent communications appropriately
- Address payment/scope discussions with appropriate care
- Always maintain professional boundaries
    `.trim();
  }

  /**
   * Generate context description for the prompt
   */
  private static getContextDescription(context: ResponseContext): string {
    const descriptions = {
      urgency: {
        immediate: 'This requires an urgent/immediate response',
        standard: 'This is a standard business communication',
        non_urgent: 'This is non-urgent and can be addressed thoughtfully',
      },
      messageType: {
        update: 'Client is requesting a project status update',
        question: 'Client has a question that needs answering',
        concern: 'Client has raised a concern or issue',
        deliverable: 'Related to work delivery or completion',
        payment: 'Payment or billing related discussion',
        scope_change: 'Discussion about project scope changes',
      },
      relationshipStage: {
        new: 'New client relationship - first time working together',
        established: 'Established working relationship',
        difficult: 'Challenging client relationship that needs careful handling',
        long_term: 'Long-term client with years of collaboration',
      },
      projectPhase: {
        discovery: 'Project is in discovery/planning phase',
        active: 'Project is actively in progress',
        completion: 'Project is nearing completion',
        maintenance: 'Project is in maintenance/support phase',
        on_hold: 'Project is currently on hold',
      },
    };

    return `
${context.clientName ? `- Client Name: ${context.clientName}` : ''}
${context.userName ? `- Your Name: ${context.userName}` : ''}
- Urgency: ${descriptions.urgency[context.urgency]}
- Message Type: ${descriptions.messageType[context.messageType]}
- Relationship Stage: ${descriptions.relationshipStage[context.relationshipStage]}
- Project Phase: ${descriptions.projectPhase[context.projectPhase]}
${context.customNotes ? `- Additional Context: ${context.customNotes}` : ''}
    `.trim();
  }

  /**
   * Validate and format the AI response
   */
  private static validateAndFormatResponse(parsedResponse: any): AIResponseOptions[] {
    if (!parsedResponse.responses || !Array.isArray(parsedResponse.responses)) {
      throw new Error('Invalid response format from AI');
    }

    return parsedResponse.responses.map((response: any, index: number) => {
      if (!response.content || typeof response.content !== 'string') {
        throw new Error(`Invalid response content at index ${index}`);
      }

      return {
        content: response.content.trim(),
        tone: response.tone || 'professional',
        length: response.length || 'standard',
        confidence: typeof response.confidence === 'number' ? response.confidence : 0.8,
        reasoning: response.reasoning || 'AI-generated response',
      } as AIResponseOptions;
    });
  }

  /**
   * Calculate estimated API cost for a response generation
   */
  static estimateCost(messageLength: number, responseCount: number = 3): number {
    // Rough estimation based on OpenAI GPT-4 pricing
    // This is a simplified calculation and should be updated with actual pricing
    const inputTokens = Math.ceil(messageLength / 4) + 200; // Prompt + context
    const outputTokens = responseCount * 150; // Estimated tokens per response
    const costPerToken = 0.00003; // Approximate GPT-4 cost per token

    return Math.ceil((inputTokens + outputTokens) * costPerToken * 100); // Return cost in cents
  }

  /**
   * Generate a response focused on moving the project forward
   */
  static async generateMoveForwardResponse(
    originalMessage: string,
    context?: {
      clientName?: string;
      userName?: string;
      projectContext?: string;
    }
  ): Promise<string> {
    const prompt = `
Generate a professional, proactive response that moves the project forward.

CLIENT MESSAGE:
"${originalMessage}"

${context?.projectContext ? `PROJECT CONTEXT: ${context.projectContext}` : ''}

REQUIREMENTS:
1. Identify any unclear points or missing info and ask clarifying questions
2. Propose concrete next steps with clear action items
3. If timeline/deliverables are mentioned, confirm understanding
4. Keep the tone collaborative and solution-oriented
5. Use "Just to confirm..." or "To make sure we're aligned..." language where appropriate
6. Keep it concise - 3-5 sentences max
${context?.clientName ? `7. Address the client as "${context.clientName}"` : ''}
${context?.userName ? `8. Sign off with "${context.userName}"` : ''}

Focus on action items and clarity. End with a specific question or proposed next step.

Generate ONLY the response text, no JSON or formatting.
    `.trim();

    try {
      const completion = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a proactive, organized freelancer who keeps projects moving forward. Generate responses that clarify requirements and propose clear next steps.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 350,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }

      return responseContent.trim();
    } catch (error: any) {
      console.error('AIResponseService: Error generating move forward response', error);

      if (error.status === 429) {
        throw new Error('OpenAI quota exceeded. Please check your billing at https://platform.openai.com/account/billing');
      }

      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please verify your OPENAI_API_KEY in .env.local');
      }

      // Fallback to template response
      const greeting = context?.clientName ? `Hi ${context.clientName},\n\n` : '';
      const signOff = context?.userName ? `\n\nBest,\n${context.userName}` : '';

      return `${greeting}Thanks for the update! Just to make sure we're aligned - could you clarify the priority of these items? Once I have that, I can map out the next steps and timeline for you.${signOff}`;
    }
  }

  /**
   * Generate a boundary-setting response with change order details inline
   */
  static async generateBoundaryResponse(
    originalMessage: string,
    changeOrderData: {
      title: string;
      description?: string;
      lineItems: { description: string; hours: number; rate: number }[];
      additionalTimelineDays: number;
      subtotal: number;
    },
    context?: {
      clientName?: string;
      userName?: string;
    }
  ): Promise<string> {
    const lineItemsSummary = changeOrderData.lineItems
      .map((item) => `${item.description} (~${item.hours}h)`)
      .join(', ');

    const timelineText =
      changeOrderData.additionalTimelineDays > 0
        ? `and would extend our timeline by approximately ${changeOrderData.additionalTimelineDays} ${changeOrderData.additionalTimelineDays === 1 ? 'day' : 'days'}`
        : '';

    const prompt = `
Generate a professional, friendly response to a client who has requested additional work outside the current project scope.

ORIGINAL CLIENT MESSAGE:
"${originalMessage}"

CHANGE ORDER DETAILS:
- Work requested: ${changeOrderData.title}
- Scope items: ${lineItemsSummary}
- Estimated cost: $${changeOrderData.subtotal.toFixed(2)}
${timelineText ? `- Timeline impact: ${timelineText}` : ''}

REQUIREMENTS:
1. Be warm and positive - show you're happy to help
2. Naturally weave the cost and timeline into the message (NOT as a separate block)
3. Keep it conversational, not like a formal quote
4. End with a clear call-to-action asking if they'd like to proceed
5. Keep it concise - 3-4 sentences max
${context?.clientName ? `6. Address the client as "${context.clientName}"` : ''}
${context?.userName ? `7. Sign off with "${context.userName}"` : ''}

EXAMPLE TONE (but don't copy exactly):
"Happy to help with that! Adding [feature] would be about $X and take roughly X days on top of our current timeline. Want me to go ahead with it?"

Generate ONLY the response text, no JSON or formatting.
    `.trim();

    try {
      const completion = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a friendly, professional freelancer who sets clear boundaries while maintaining positive client relationships. Generate concise, natural-sounding responses.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }

      return responseContent.trim();
    } catch (error: any) {
      console.error('AIResponseService: Error generating boundary response', error);

      if (error.status === 429) {
        throw new Error('OpenAI quota exceeded. Please check your billing at https://platform.openai.com/account/billing');
      }

      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please verify your OPENAI_API_KEY in .env.local');
      }

      // Fallback to template response if AI fails
      const greeting = context?.clientName ? `Hi ${context.clientName},\n\n` : '';
      const signOff = context?.userName ? `\n\nBest,\n${context.userName}` : '';

      return `${greeting}Thanks for reaching out about this! I'd be happy to help with ${changeOrderData.title.toLowerCase()}. This would be approximately $${changeOrderData.subtotal.toFixed(2)}${timelineText ? ` ${timelineText}` : ''}. Would you like me to proceed with this as an add-on to our current project?${signOff}`;
    }
  }

  /**
   * Regenerate responses with refinement instructions
   */
  static async regenerateWithRefinement(
    originalMessage: string,
    context: ResponseContext,
    previousResponses: AIResponseOptions[],
    refinementInstructions: string,
    styleProfile?: any
  ): Promise<AIResponseOptions[]> {
    const refinedPrompt = `
${this.buildPrompt(originalMessage, context)}

PREVIOUS RESPONSES:
${previousResponses.map((r, i) => `${i + 1}. ${r.content}`).join('\n')}

REFINEMENT INSTRUCTIONS:
${refinementInstructions}

Please generate improved responses based on the refinement feedback above.
    `;

    try {
      const completion = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(styleProfile),
          },
          {
            role: 'user',
            content: refinedPrompt,
          },
        ],
        temperature: 0.8, // Slightly higher temperature for refinement
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Empty response from OpenAI during refinement');
      }

      const parsedResponse = JSON.parse(responseContent);
      return this.validateAndFormatResponse(parsedResponse);
    } catch (error: any) {
      console.error('AIResponseService: Error during refinement', error);

      // Handle specific OpenAI errors with better messaging
      if (error.status === 429) {
        throw new Error('OpenAI quota exceeded. Please check your billing at https://platform.openai.com/account/billing');
      }

      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please verify your OPENAI_API_KEY in .env.local');
      }

      throw new Error(`AI refinement failed: ${error.message}`);
    }
  }
}
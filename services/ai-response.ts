import OpenAI from 'openai';
import { type AIResponseOptions, type ResponseContext, type GenerateResponseInput } from '@freelance-flow/shared';

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
    styleProfile?: any
  ): Promise<AIResponseOptions[]> {
    try {
      const prompt = this.buildPrompt(originalMessage, context);

      const completion = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(styleProfile),
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

    return `
Please generate 2-3 professional response options for the following client message:

CLIENT MESSAGE:
"${originalMessage}"

CONTEXT:
${contextDescription}

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
  private static getSystemPrompt(styleProfile?: any): string {
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

    return `
You are an expert freelancer communication assistant. Generate professional email/message responses that help freelancers communicate effectively with their clients.
${styleInstructions}

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
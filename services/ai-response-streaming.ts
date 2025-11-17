import OpenAI from 'openai';
import { type ResponseContext } from '@freelance-flow/shared';

// OpenAI Client Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

// Default model configuration
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4';

/**
 * Sanitize user input to prevent prompt injection attacks
 * Removes patterns that could manipulate the AI's behavior
 */
function sanitizeUserInput(input: string): string {
  if (!input) return '';

  // Remove common prompt injection patterns
  const dangerousPatterns = [
    /ignore\s+(previous|above|all|prior)\s+instructions?/gi,
    /disregard\s+(previous|above|all|prior)\s+instructions?/gi,
    /forget\s+(previous|above|all|prior)\s+instructions?/gi,
    /new\s+instructions?:/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /\[SYSTEM\]/gi,
    /\[INST\]/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
  ];

  let sanitized = input;

  // Remove dangerous patterns
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Limit consecutive newlines to prevent context breaking
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');

  // Trim and limit length
  sanitized = sanitized.trim().slice(0, 5000);

  return sanitized;
}

export interface StreamChunk {
  type: 'start' | 'content' | 'complete' | 'error';
  responseIndex?: number;
  content?: string;
  metadata?: {
    tone?: string;
    length?: string;
    confidence?: number;
    reasoning?: string;
  };
  error?: string;
}

export class AIResponseStreamingService {
  /**
   * Generate AI responses with streaming support
   * Yields chunks as they're generated
   */
  static async* generateResponsesStream(
    originalMessage: string,
    context: ResponseContext,
    styleProfile?: any,
    refinementInstructions?: string,
    previousResponses?: string[]
  ): AsyncGenerator<StreamChunk> {
    try {
      const prompt = this.buildPrompt(originalMessage, context, refinementInstructions, previousResponses);

      // We'll generate 3 responses sequentially with streaming
      // This provides a better UX than waiting for all at once
      const responseCounts = [
        { tone: 'professional', length: 'standard' },
        { tone: 'casual', length: 'brief' },
        { tone: 'formal', length: 'detailed' },
      ];

      for (let i = 0; i < responseCounts.length; i++) {
        yield {
          type: 'start',
          responseIndex: i,
        };

        const specificPrompt = `${prompt}\n\nFor this response, aim for a ${responseCounts[i].tone} tone with ${responseCounts[i].length} length.`;

        const stream = await openai.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [
            {
              role: 'system',
              content: this.getSystemPromptForStreaming(styleProfile),
            },
            {
              role: 'user',
              content: specificPrompt,
            },
          ],
          temperature: 0.7 + (i * 0.05), // Slight variation for each response
          max_tokens: 500,
          stream: true,
        });

        let accumulatedContent = '';

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            accumulatedContent += content;
            yield {
              type: 'content',
              responseIndex: i,
              content: content,
            };
          }
        }

        // After streaming completes, extract metadata
        const metadata = this.extractMetadata(accumulatedContent, responseCounts[i]);

        yield {
          type: 'complete',
          responseIndex: i,
          metadata: {
            tone: responseCounts[i].tone,
            length: responseCounts[i].length,
            confidence: metadata.confidence,
            reasoning: metadata.reasoning,
          },
        };
      }
    } catch (error: any) {
      console.error('AIResponseStreamingService: Error during streaming', error);

      yield {
        type: 'error',
        error: error.message || 'Failed to generate streaming responses',
      };
    }
  }

  /**
   * Build the prompt for streaming generation
   */
  private static buildPrompt(originalMessage: string, context: ResponseContext, refinementInstructions?: string, previousResponses?: string[]): string {
    // Sanitize all user inputs
    const sanitizedMessage = sanitizeUserInput(originalMessage);
    const sanitizedRefinementInstructions = refinementInstructions ? sanitizeUserInput(refinementInstructions) : '';
    const sanitizedPreviousResponses = previousResponses?.map(r => sanitizeUserInput(r)) || [];
    const sanitizedCustomNotes = context.customNotes ? sanitizeUserInput(context.customNotes) : '';
    const sanitizedClientName = context.clientName ? sanitizeUserInput(context.clientName) : '';
    const sanitizedUserName = context.userName ? sanitizeUserInput(context.userName) : '';

    // Update context with sanitized values
    const sanitizedContext = {
      ...context,
      customNotes: sanitizedCustomNotes,
      clientName: sanitizedClientName,
      userName: sanitizedUserName,
    };

    const contextDescription = this.getContextDescription(sanitizedContext);

    let previousResponsesText = '';
    if (sanitizedPreviousResponses.length > 0 && sanitizedRefinementInstructions) {
      previousResponsesText = `

PREVIOUS RESPONSES THAT NEED REFINEMENT:
${sanitizedPreviousResponses.map((r, i) => `${i + 1}. ${r}`).join('\n\n')}

REFINEMENT INSTRUCTIONS:
${sanitizedRefinementInstructions}

Please generate NEW responses that incorporate the refinement instructions above. Make sure to apply the requested changes (e.g., if asked to change "3 days" to "5 days", make that specific change).
`;
    }

    return `
Please generate a professional response for the following client message:

CLIENT MESSAGE:
"${sanitizedMessage}"

CONTEXT:
${contextDescription}
${previousResponsesText}

Requirements:
- Be professional and appropriate for the context
${sanitizedContext.clientName ? `- Start with "Hello ${sanitizedContext.clientName}," or "Hi ${sanitizedContext.clientName}," depending on the tone` : '- Use an appropriate greeting'}
${sanitizedContext.userName ? `- End with an appropriate sign-off using the name "${sanitizedContext.userName}"` : '- End with an appropriate professional sign-off'}
- Be clear, concise, and solution-oriented
${sanitizedRefinementInstructions ? `- IMPORTANT: Apply the refinement instructions: ${sanitizedRefinementInstructions}` : ''}
    `.trim();
  }

  /**
   * Get system prompt optimized for streaming
   */
  private static getSystemPromptForStreaming(styleProfile?: any): string {
    let styleInstructions = '';

    if (styleProfile) {
      styleInstructions = `

IMPORTANT: Adopt the following communication style:

Communication Style Profile:
- Overall Summary: ${styleProfile.summary}
- Formality Level: ${styleProfile.formality}
- Tone: ${styleProfile.tone}
- Sentence Complexity: ${styleProfile.sentenceComplexity}
- Common Phrases: ${styleProfile.commonPhrases?.join(', ') || 'None'}
- Emoji Usage: ${styleProfile.emojiUsage ? 'Use emojis where appropriate.' : 'Do not use emojis.'}
      `.trim();
    }

    return `
You are an expert freelancer communication assistant. Generate professional email/message responses that help freelancers communicate effectively with their clients.
${styleInstructions}

Guidelines:
- Be professional but adjust formality based on context
- Be helpful, clear, and solution-oriented
- Consider the client relationship stage and project phase
- Handle urgent vs. non-urgent communications appropriately
- Always maintain professional boundaries
    `.trim();
  }

  /**
   * Generate context description
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
   * Extract metadata from the generated response
   */
  private static extractMetadata(content: string, expectedStyle: { tone: string; length: string }) {
    // Simple confidence calculation based on length and structure
    const wordCount = content.split(/\s+/).length;
    const hasGreeting = /^(Hello|Hi|Dear)/i.test(content.trim());
    const hasSignoff = /(Best|Regards|Thanks|Sincerely)/i.test(content);

    let confidence = 0.7;
    if (hasGreeting) confidence += 0.1;
    if (hasSignoff) confidence += 0.1;
    if (wordCount > 20) confidence += 0.05;
    if (wordCount > 50) confidence += 0.05;

    const reasoning = `Generated ${expectedStyle.length} response with ${expectedStyle.tone} tone. ${hasGreeting && hasSignoff ? 'Includes proper greeting and sign-off.' : ''}`;

    return {
      confidence: Math.min(confidence, 0.95),
      reasoning,
    };
  }
}

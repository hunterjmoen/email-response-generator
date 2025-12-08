import OpenAI from 'openai';

// OpenAI Client Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

// Use a faster, cheaper model for classification tasks
const DETECTION_MODEL = 'gpt-4o-mini';

export interface DetectedContext {
  urgency: 'immediate' | 'standard' | 'non_urgent';
  messageType: 'update' | 'question' | 'concern' | 'deliverable' | 'payment' | 'scope_change';
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
  confidence: number;
  reasoning: string;
}

export interface ContextDetectionResult {
  detected: DetectedContext;
  scopeCreepDetected: boolean;
  scopeCreepPhrases?: string[];
  scopeCreepConfidence?: number;
}

/**
 * Service for detecting context and scope creep from client messages
 */
export class ContextDetectionService {
  /**
   * Common scope creep phrases to detect
   */
  private static SCOPE_CREEP_PATTERNS = [
    'while you\'re at it',
    'while we\'re at it',
    'quick addition',
    'small addition',
    'quick change',
    'small change',
    'shouldn\'t take long',
    'won\'t take long',
    'one more thing',
    'just one more',
    'can you also',
    'could you also',
    'before you finish',
    'before we wrap up',
    'i was thinking',
    'would it be possible to add',
    'would it be possible to include',
    'can we add',
    'can we include',
    'might as well',
    'since you\'re already',
    'easy fix',
    'simple addition',
    'real quick',
    'super quick',
    'tiny favor',
    'small favor',
  ];

  /**
   * Detect context from a client message
   */
  static async detectContext(message: string): Promise<ContextDetectionResult> {
    try {
      // Run scope creep detection in parallel with AI analysis
      const scopeCreepResult = this.detectScopeCreepPatterns(message);
      const aiResult = await this.analyzeWithAI(message, scopeCreepResult.detected);

      // Calculate scope creep confidence
      const isScopeCreep = scopeCreepResult.detected || aiResult.messageType === 'scope_change';
      let scopeCreepConfidence: number | undefined;

      if (isScopeCreep) {
        if (scopeCreepResult.detected && aiResult.messageType === 'scope_change') {
          // Both pattern and AI detected - use the higher confidence
          scopeCreepConfidence = Math.max(scopeCreepResult.confidence, aiResult.confidence);
        } else if (scopeCreepResult.detected) {
          scopeCreepConfidence = scopeCreepResult.confidence;
        } else {
          // AI detected scope_change but no pattern match
          scopeCreepConfidence = aiResult.confidence;
        }
      }

      return {
        detected: aiResult,
        scopeCreepDetected: isScopeCreep,
        scopeCreepPhrases: scopeCreepResult.phrases,
        scopeCreepConfidence,
      };
    } catch (error: any) {
      console.error('ContextDetectionService: Error detecting context', error);

      // Return sensible defaults on error
      return {
        detected: {
          urgency: 'standard',
          messageType: 'question',
          sentiment: 'neutral',
          confidence: 0.5,
          reasoning: 'Unable to analyze message automatically',
        },
        scopeCreepDetected: false,
      };
    }
  }

  /**
   * Detect scope creep using pattern matching
   */
  private static detectScopeCreepPatterns(message: string): {
    detected: boolean;
    phrases: string[];
    confidence: number;
  } {
    const lowerMessage = message.toLowerCase();
    const detectedPhrases: string[] = [];

    for (const pattern of this.SCOPE_CREEP_PATTERNS) {
      if (lowerMessage.includes(pattern)) {
        detectedPhrases.push(pattern);
      }
    }

    // Calculate confidence based on number of patterns detected
    const confidence = Math.min(0.5 + (detectedPhrases.length * 0.15), 0.95);

    return {
      detected: detectedPhrases.length > 0,
      phrases: detectedPhrases,
      confidence: detectedPhrases.length > 0 ? confidence : 0,
    };
  }

  /**
   * Use AI to analyze the message for context
   */
  private static async analyzeWithAI(
    message: string,
    patternBasedScopeCreep: boolean
  ): Promise<DetectedContext> {
    const systemPrompt = `You are an expert at analyzing client communications for freelancers.
Analyze the following client message and determine:

1. URGENCY: How urgent is this message?
   - immediate: Contains words like "urgent", "ASAP", "emergency", "right away", deadline mentions
   - standard: Normal business communication, no urgency indicators
   - non_urgent: Explicitly not urgent, casual check-in, "when you have time"

2. MESSAGE_TYPE: What type of message is this?
   - update: Client requesting or providing project status/progress info
   - question: Client asking a question or seeking clarification
   - concern: Client expressing worry, dissatisfaction, or raising an issue
   - deliverable: Related to work delivery, completion, or reviewing work
   - payment: Related to invoices, billing, payment terms
   - scope_change: Request for additional work, new features, changes to agreed scope
   ${patternBasedScopeCreep ? '(Note: Pattern matching detected potential scope creep phrases)' : ''}

3. SENTIMENT: What is the emotional tone of the message?
   - positive: Happy, satisfied, appreciative, excited
   - neutral: Business-like, matter-of-fact, no strong emotion
   - negative: Disappointed, unhappy, dissatisfied
   - frustrated: Clearly frustrated, impatient, or upset

Respond with valid JSON only:
{
  "urgency": "immediate|standard|non_urgent",
  "messageType": "update|question|concern|deliverable|payment|scope_change",
  "sentiment": "positive|neutral|negative|frustrated",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of your analysis"
}`;

    const completion = await openai.chat.completions.create({
      model: DETECTION_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this client message:\n\n"${message}"` },
      ],
      temperature: 0.3, // Lower temperature for more consistent classification
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(responseContent);

    // Validate and sanitize the response
    return {
      urgency: this.validateUrgency(parsed.urgency),
      messageType: this.validateMessageType(parsed.messageType),
      sentiment: this.validateSentiment(parsed.sentiment),
      confidence: typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.7,
      reasoning: parsed.reasoning || 'AI analysis complete',
    };
  }

  private static validateUrgency(value: any): DetectedContext['urgency'] {
    const valid = ['immediate', 'standard', 'non_urgent'];
    return valid.includes(value) ? value : 'standard';
  }

  private static validateMessageType(value: any): DetectedContext['messageType'] {
    const valid = ['update', 'question', 'concern', 'deliverable', 'payment', 'scope_change'];
    return valid.includes(value) ? value : 'question';
  }

  private static validateSentiment(value: any): DetectedContext['sentiment'] {
    const valid = ['positive', 'neutral', 'negative', 'frustrated'];
    return valid.includes(value) ? value : 'neutral';
  }
}

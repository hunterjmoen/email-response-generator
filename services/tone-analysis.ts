/**
 * TonePrint - Client Tone Fingerprinting Service
 *
 * Analyzes client messages to build a communication style "fingerprint"
 * that can be used to mirror their style in responses.
 */

export interface ToneFingerprint {
  formality: 'casual' | 'neutral' | 'formal';
  brevity: 'terse' | 'moderate' | 'verbose';
  emojiUsage: boolean;
  greetingStyle: 'none' | 'casual' | 'formal';
  signOffStyle: 'none' | 'casual' | 'formal';
  vocabularyLevel: 'simple' | 'moderate' | 'sophisticated';
  avgSentenceLength: number;
  sampleCount: number;
  lastUpdated: string;
}

export class ToneAnalysisService {
  /**
   * Analyze a client message and extract tone characteristics
   */
  static analyzeMessage(message: string): Partial<ToneFingerprint> {
    const analysis: Partial<ToneFingerprint> = {};

    // Analyze formality
    analysis.formality = this.detectFormality(message);

    // Analyze brevity
    analysis.brevity = this.detectBrevity(message);

    // Detect emoji usage
    analysis.emojiUsage = this.detectEmojis(message);

    // Analyze greeting style
    analysis.greetingStyle = this.detectGreetingStyle(message);

    // Analyze sign-off style
    analysis.signOffStyle = this.detectSignOffStyle(message);

    // Analyze vocabulary level
    analysis.vocabularyLevel = this.detectVocabularyLevel(message);

    // Calculate average sentence length
    analysis.avgSentenceLength = this.calculateAvgSentenceLength(message);

    return analysis;
  }

  /**
   * Merge a new analysis with an existing fingerprint
   * Uses weighted averaging to build up the profile over time
   */
  static mergeFingerprints(
    existing: ToneFingerprint | null,
    newAnalysis: Partial<ToneFingerprint>
  ): ToneFingerprint {
    if (!existing) {
      return {
        formality: newAnalysis.formality || 'neutral',
        brevity: newAnalysis.brevity || 'moderate',
        emojiUsage: newAnalysis.emojiUsage || false,
        greetingStyle: newAnalysis.greetingStyle || 'none',
        signOffStyle: newAnalysis.signOffStyle || 'none',
        vocabularyLevel: newAnalysis.vocabularyLevel || 'moderate',
        avgSentenceLength: newAnalysis.avgSentenceLength || 15,
        sampleCount: 1,
        lastUpdated: new Date().toISOString(),
      };
    }

    // Weight new samples more heavily at first, then stabilize
    const weight = Math.min(0.3, 1 / (existing.sampleCount + 1));
    const existingWeight = 1 - weight;

    return {
      // For categorical values, only change if we have enough samples showing a pattern
      formality: this.weightedCategory(
        existing.formality,
        newAnalysis.formality || existing.formality,
        existing.sampleCount
      ) as ToneFingerprint['formality'],
      brevity: this.weightedCategory(
        existing.brevity,
        newAnalysis.brevity || existing.brevity,
        existing.sampleCount
      ) as ToneFingerprint['brevity'],
      emojiUsage: existing.sampleCount > 3
        ? existing.emojiUsage || newAnalysis.emojiUsage || false
        : newAnalysis.emojiUsage || existing.emojiUsage,
      greetingStyle: this.weightedCategory(
        existing.greetingStyle,
        newAnalysis.greetingStyle || existing.greetingStyle,
        existing.sampleCount
      ) as ToneFingerprint['greetingStyle'],
      signOffStyle: this.weightedCategory(
        existing.signOffStyle,
        newAnalysis.signOffStyle || existing.signOffStyle,
        existing.sampleCount
      ) as ToneFingerprint['signOffStyle'],
      vocabularyLevel: this.weightedCategory(
        existing.vocabularyLevel,
        newAnalysis.vocabularyLevel || existing.vocabularyLevel,
        existing.sampleCount
      ) as ToneFingerprint['vocabularyLevel'],
      // Numerical average
      avgSentenceLength: Math.round(
        existing.avgSentenceLength * existingWeight +
        (newAnalysis.avgSentenceLength || existing.avgSentenceLength) * weight
      ),
      sampleCount: existing.sampleCount + 1,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Generate human-readable description of a fingerprint
   */
  static describeFingerprint(fingerprint: ToneFingerprint): string {
    const parts: string[] = [];

    // Formality
    if (fingerprint.formality === 'casual') {
      parts.push('casual and relaxed');
    } else if (fingerprint.formality === 'formal') {
      parts.push('formal and professional');
    }

    // Brevity
    if (fingerprint.brevity === 'terse') {
      parts.push('prefers brief messages');
    } else if (fingerprint.brevity === 'verbose') {
      parts.push('writes detailed messages');
    }

    // Emoji
    if (fingerprint.emojiUsage) {
      parts.push('uses emojis');
    }

    // Greeting
    if (fingerprint.greetingStyle === 'casual') {
      parts.push('casual greetings');
    } else if (fingerprint.greetingStyle === 'formal') {
      parts.push('formal greetings');
    }

    return parts.length > 0 ? parts.join(', ') : 'neutral communication style';
  }

  /**
   * Generate short badge text for UI display
   */
  static getBadgeText(fingerprint: ToneFingerprint): string {
    const parts: string[] = [];

    // Capitalize first letter
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    parts.push(cap(fingerprint.formality));

    if (fingerprint.brevity !== 'moderate') {
      parts.push(cap(fingerprint.brevity));
    }

    if (fingerprint.emojiUsage) {
      parts.push('Emoji');
    }

    return parts.join(' · ');
  }

  // ============ Private Analysis Methods ============

  private static detectFormality(message: string): ToneFingerprint['formality'] {
    const lower = message.toLowerCase();

    // Formal indicators
    const formalIndicators = [
      /\bdear\b/i,
      /\bsincerely\b/i,
      /\bregards\b/i,
      /\bkindly\b/i,
      /\bplease be advised\b/i,
      /\bi would like to\b/i,
      /\bper our\b/i,
      /\bas per\b/i,
      /\bpursuant\b/i,
    ];

    // Casual indicators
    const casualIndicators = [
      /\bhey\b/i,
      /\bhi\b/i,
      /\bthanks!\b/i,
      /\byeah\b/i,
      /\bnope\b/i,
      /\bgonna\b/i,
      /\bwanna\b/i,
      /\basap\b/i,
      /\bbtw\b/i,
      /\bfyi\b/i,
      /!{2,}/,
      /\blol\b/i,
      /\bhaha\b/i,
    ];

    let formalScore = 0;
    let casualScore = 0;

    for (const pattern of formalIndicators) {
      if (pattern.test(message)) formalScore++;
    }

    for (const pattern of casualIndicators) {
      if (pattern.test(message)) casualScore++;
    }

    if (formalScore > casualScore + 1) return 'formal';
    if (casualScore > formalScore + 1) return 'casual';
    return 'neutral';
  }

  private static detectBrevity(message: string): ToneFingerprint['brevity'] {
    const wordCount = message.split(/\s+/).filter(w => w.length > 0).length;

    if (wordCount < 30) return 'terse';
    if (wordCount > 100) return 'verbose';
    return 'moderate';
  }

  private static detectEmojis(message: string): boolean {
    // Check for text emoticons
    const textEmoticons = /:\)|:\(|:D|;\)|:P|:-\)|:-\(|:-D|;-\)|<3|xD|:'\)/i;
    if (textEmoticons.test(message)) return true;

    // Check for Unicode emojis using code point ranges
    for (const char of message) {
      const code = char.codePointAt(0);
      if (code === undefined) continue;

      // Common emoji ranges
      if (
        (code >= 0x1F300 && code <= 0x1F9FF) || // Misc Symbols, Emoticons, etc.
        (code >= 0x2600 && code <= 0x26FF) ||   // Misc Symbols
        (code >= 0x2700 && code <= 0x27BF) ||   // Dingbats
        (code >= 0x1F600 && code <= 0x1F64F) || // Emoticons
        (code >= 0x1F680 && code <= 0x1F6FF)    // Transport/Map
      ) {
        return true;
      }
    }
    return false;
  }

  private static detectGreetingStyle(message: string): ToneFingerprint['greetingStyle'] {
    const firstLine = message.split('\n')[0].trim().toLowerCase();

    // Formal greetings
    if (/^(dear|good morning|good afternoon|good evening)/.test(firstLine)) {
      return 'formal';
    }

    // Casual greetings
    if (/^(hey|hi|hello|yo|sup|hiya)/.test(firstLine)) {
      return 'casual';
    }

    return 'none';
  }

  private static detectSignOffStyle(message: string): ToneFingerprint['signOffStyle'] {
    const lower = message.toLowerCase();

    // Formal sign-offs
    const formalSignOffs = [
      /sincerely/i,
      /best regards/i,
      /kind regards/i,
      /respectfully/i,
      /yours truly/i,
      /warm regards/i,
    ];

    // Casual sign-offs
    const casualSignOffs = [
      /thanks!/i,
      /cheers/i,
      /talk soon/i,
      /later/i,
      /ttyl/i,
      /catch you/i,
      /take care/i,
    ];

    for (const pattern of formalSignOffs) {
      if (pattern.test(lower)) return 'formal';
    }

    for (const pattern of casualSignOffs) {
      if (pattern.test(lower)) return 'casual';
    }

    return 'none';
  }

  private static detectVocabularyLevel(message: string): ToneFingerprint['vocabularyLevel'] {
    // Simple heuristic based on average word length and complex words
    const words = message.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return 'moderate';

    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const complexWords = words.filter(w => w.length > 8).length;
    const complexRatio = complexWords / words.length;

    if (avgWordLength > 6 || complexRatio > 0.15) return 'sophisticated';
    if (avgWordLength < 4.5 && complexRatio < 0.05) return 'simple';
    return 'moderate';
  }

  private static calculateAvgSentenceLength(message: string): number {
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 15;

    const totalWords = sentences.reduce((sum, s) => {
      return sum + s.split(/\s+/).filter(w => w.length > 0).length;
    }, 0);

    return Math.round(totalWords / sentences.length);
  }

  private static weightedCategory(
    existing: string,
    newValue: string,
    sampleCount: number
  ): string {
    // For low sample counts, be more willing to change
    // For high sample counts, stick with existing unless we see a pattern
    if (sampleCount < 3) {
      return newValue;
    }
    // After enough samples, prefer existing value for stability
    return existing;
  }
}

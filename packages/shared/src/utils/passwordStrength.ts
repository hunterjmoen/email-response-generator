/**
 * Password strength analysis utilities
 */

export interface PasswordStrengthResult {
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  feedback: string[];
  isValid: boolean;
  strength: 'very weak' | 'weak' | 'fair' | 'strong' | 'very strong';
}

export function analyzePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else if (password.length >= 12) {
    score += 1;
  }

  // Character variety checks
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (hasUppercase) score += 1;
  else feedback.push('Add uppercase letters');

  if (hasLowercase) score += 1;
  else feedback.push('Add lowercase letters');

  if (hasNumbers) score += 1;
  else feedback.push('Add numbers');

  if (hasSpecialChars) score += 1;
  else feedback.push('Add special characters');

  // Common patterns check
  const weakPatterns = [
    { pattern: /123456/, message: 'Avoid sequential numbers' },
    { pattern: /password/i, message: 'Avoid common words like "password"' },
    { pattern: /qwerty/i, message: 'Avoid keyboard patterns' },
    { pattern: /abc123/i, message: 'Avoid simple combinations' },
    { pattern: /^(.)\1+$/, message: 'Avoid repeating characters' },
  ];

  for (const { pattern, message } of weakPatterns) {
    if (pattern.test(password)) {
      feedback.push(message);
      score = Math.max(0, score - 1);
    }
  }

  // Determine strength level
  const strengthMap: Record<number, PasswordStrengthResult['strength']> = {
    0: 'very weak',
    1: 'weak',
    2: 'fair',
    3: 'strong',
    4: 'very strong',
  };

  const strength = strengthMap[Math.min(score, 4)];
  const isValid = score >= 3 && feedback.length === 0;

  return {
    score,
    feedback,
    isValid,
    strength,
  };
}
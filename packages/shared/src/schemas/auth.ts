import { z } from 'zod';

// Enhanced password validation function
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .refine(
    (password) => {
      // Check for at least one uppercase letter
      return /[A-Z]/.test(password);
    },
    { message: 'Password must contain at least one uppercase letter' }
  )
  .refine(
    (password) => {
      // Check for at least one lowercase letter
      return /[a-z]/.test(password);
    },
    { message: 'Password must contain at least one lowercase letter' }
  )
  .refine(
    (password) => {
      // Check for at least one number
      return /\d/.test(password);
    },
    { message: 'Password must contain at least one number' }
  )
  .refine(
    (password) => {
      // Check for at least one special character
      return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    },
    { message: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"\\|,.<>\/?)' }
  )
  .refine(
    (password) => {
      // Check that password doesn't contain common weak patterns
      const weakPatterns = [
        /123456/,
        /password/i,
        /qwerty/i,
        /abc123/i,
        /^(.)\1+$/, // All same characters
      ];
      return !weakPatterns.some(pattern => pattern.test(password));
    },
    { message: 'Password contains common weak patterns and is not allowed' }
  );

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  industry: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const PasswordResetSchema = z.object({
  token: z.string(),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof PasswordResetSchema>;
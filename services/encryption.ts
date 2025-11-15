// @ts-nocheck
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { serverConfig } from '../config/server';

export class EncryptionService {
  private keyId: string;
  private algorithm = 'aes-256-gcm';
  private secretKey: Buffer;
  private keySalt: Buffer;

  constructor() {
    this.keyId = serverConfig.encryption.keyId;

    // Use environment variable for salt, or generate a secure random one
    // In production, you should use a consistent salt stored securely (e.g., in KMS)
    const saltEnv = process.env.ENCRYPTION_SALT;
    if (saltEnv) {
      this.keySalt = Buffer.from(saltEnv, 'hex');
    } else {
      // Generate a random salt (this should be persisted in production)
      this.keySalt = randomBytes(32);
      if (process.env.NODE_ENV === 'production') {
        console.error('[CRITICAL] ENCRYPTION_SALT not set in production. Using random salt - data encrypted with this key cannot be decrypted after restart!');
      } else {
        console.warn('[WARNING] ENCRYPTION_SALT not set. Using random salt. Set ENCRYPTION_SALT in .env for persistent encryption.');
      }
    }

    // Use scrypt for secure key derivation from the secret with proper salt
    this.secretKey = scryptSync(serverConfig.encryption.secretKey, this.keySalt, 32);
  }

  async encrypt(plaintext: string): Promise<string> {
    try {
      // Generate a random initialization vector for each encryption
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, this.secretKey, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get the authentication tag for GCM mode
      const authTag = cipher.getAuthTag();

      // Combine IV, auth tag, and encrypted data
      // Format: iv:authTag:encryptedData
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async decrypt(ciphertext: string): Promise<string> {
    try {
      const parts = ciphertext.split(':');

      // Support legacy format (iv:encryptedData) for backwards compatibility
      if (parts.length === 2) {
        return this.decryptLegacy(ciphertext);
      }

      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
      }

      const [ivHex, authTagHex, encryptedData] = parts;

      if (!ivHex || !authTagHex || !encryptedData) {
        throw new Error('Invalid ciphertext format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = createDecipheriv(this.algorithm, this.secretKey, iv);

      // Set the authentication tag for GCM mode
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt legacy format (CBC mode without auth tag)
   * This is for backwards compatibility with existing encrypted data
   */
  private decryptLegacy(ciphertext: string): string {
    try {
      const [ivHex, encryptedData] = ciphertext.split(':');
      if (!ivHex || !encryptedData) {
        throw new Error('Invalid legacy ciphertext format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv('aes-256-cbc', this.secretKey, iv);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Legacy decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async encryptField(fieldValue: string | null): Promise<string | null> {
    if (!fieldValue) return null;
    return this.encrypt(fieldValue);
  }

  async decryptField(encryptedValue: string | null): Promise<string | null> {
    if (!encryptedValue) return null;
    return this.decrypt(encryptedValue);
  }

  /**
   * Returns the current key ID for key rotation support
   */
  getKeyId(): string {
    return this.keyId;
  }
}

export const encryptionService = new EncryptionService();

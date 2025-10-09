import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { serverConfig } from '../config/server';

export class EncryptionService {
  private keyId: string;
  private algorithm = 'aes-256-cbc';
  private secretKey: Buffer;

  constructor() {
    this.keyId = serverConfig.encryption.keyId;
    // Use scrypt for secure key derivation from the secret
    this.secretKey = scryptSync(serverConfig.encryption.secretKey, 'salt', 32);
  }

  async encrypt(plaintext: string): Promise<string> {
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, this.secretKey, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Combine IV and encrypted data
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async decrypt(ciphertext: string): Promise<string> {
    try {
      const [ivHex, encryptedData] = ciphertext.split(':');
      if (!ivHex || !encryptedData) {
        throw new Error('Invalid ciphertext format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv(this.algorithm, this.secretKey, iv);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
}

export const encryptionService = new EncryptionService();
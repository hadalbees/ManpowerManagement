import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const rawKey = process.env.DATABASE_ENCRYPTION_KEY_256 || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    if (rawKey.length === 64) {
      this.key = Buffer.from(rawKey, 'hex');
    } else {
      // Key derivation if not exactly 32-byte hex
      this.key = crypto.createHash('sha256').update(rawKey).digest();
    }
  }

  /**
   * Encrypts plaintext string using AES-256-GCM.
   * Returns formatted string: ivHex:tagHex:cipherHex
   */
  encrypt(plainText: string): string {
    if (!plainText) return '';
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag();
      return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    } catch (error: any) {
      this.logger.error(`Encryption failed: ${error.message}`);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypts formatted ciphertext string: ivHex:tagHex:cipherHex
   */
  decrypt(cipherPayload: string): string {
    if (!cipherPayload) return '';
    try {
      const parts = cipherPayload.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid cipher payload format');
      }
      const [ivHex, tagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error: any) {
      this.logger.error(`Decryption failed: ${error.message}`);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  /**
   * Mask Indian 12-digit Aadhaar number: XXXX XXXX 1234
   */
  maskAadhaar(aadhaar: string): string {
    if (!aadhaar) return '';
    const clean = aadhaar.replace(/\s+/g, '');
    const last4 = clean.slice(-4);
    return `XXXX XXXX ${last4}`;
  }

  /**
   * Mask Bank Account Number: XXXXXX7890
   */
  maskBankAccount(accountNo: string): string {
    if (!accountNo) return '';
    const last4 = accountNo.slice(-4);
    return `XXXXXX${last4}`;
  }

  /**
   * Mask Indian 10-character PAN: ABCDE****F
   */
  maskPan(pan: string): string {
    if (!pan) return '';
    const clean = pan.trim().toUpperCase();
    if (clean.length < 6) return '******';
    const first5 = clean.slice(0, 5);
    const last1 = clean.slice(-1);
    return `${first5}****${last1}`;
  }
}

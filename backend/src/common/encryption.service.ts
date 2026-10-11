import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly keyBuffer: Buffer;

  constructor(configService: ConfigService) {
    const key = configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error(
        'ENCRYPTION_KEY is not set. Generate a 32-character key (e.g. `openssl rand -hex 16`) and export it before starting the application.',
      );
    }
    this.keyBuffer = Buffer.from(key, 'utf8');
  }

  encrypt(text: string): string {
    try {
      if (!text) return '';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.keyBuffer, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted; // iv:encrypted format
    } catch {
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedText: string | null | undefined): string {
    try {
      if (!encryptedText) return encryptedText as string;

      if (typeof encryptedText !== 'string' || !encryptedText.includes(':')) {
        return encryptedText;
      }

      const [ivHex, encrypted] = encryptedText.split(':');
      const iv = Buffer.from(ivHex, 'hex');

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.keyBuffer,
        iv,
      );

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch {
      return encryptedText as string; // return original instead of empty
    }
  }

  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

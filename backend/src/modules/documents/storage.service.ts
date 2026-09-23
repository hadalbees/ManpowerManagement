import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface PresignedDownloadResult {
  url: string;
  expiresAt: Date;
  storageKey: string;
  token: string;
}

@Injectable()
export class StorageService {
  private readonly allowedMimeTypes = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
  ]);

  private readonly maxFileSizeBytes = 15 * 1024 * 1024; // 15MB max file size
  private readonly secretKey = process.env.JWT_SECRET || 'fallback-secure-storage-secret-key-2026';

  /**
   * Validates file upload metadata: MIME type and file size limits
   */
  validateUpload(mimeType: string, fileSizeBytes: number): void {
    if (!this.allowedMimeTypes.has(mimeType.toLowerCase())) {
      throw new BadRequestException(
        `UNSUPPORTED_FILE_TYPE: MIME type '${mimeType}' is not permitted. Allowed types: PDF, PNG, JPEG, WEBP, DOC, DOCX, XLS, XLSX, CSV, TXT`,
      );
    }

    if (fileSizeBytes > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `FILE_SIZE_EXCEEDED: File size ${fileSizeBytes} bytes exceeds maximum allowed limit of ${this.maxFileSizeBytes} bytes (15MB)`,
      );
    }
  }

  /**
   * Generates a deterministic, collision-resistant private storage key
   */
  generateStorageKey(agencyId: string, entityType: string, entityId: string, originalFileName: string): string {
    const sanitizedName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const randomHex = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    return `private/${agencyId}/${entityType.toLowerCase()}/${entityId}/${timestamp}_${randomHex}_${sanitizedName}`;
  }

  /**
   * Generates a short-lived (15 minutes) HMAC-SHA256 signed download token for authorized file access
   */
  generatePresignedDownloadUrl(
    storageKey: string,
    agencyId: string,
    userId: string,
    expiresInMinutes: number = 15,
  ): PresignedDownloadResult {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const payload = `${agencyId}:${userId}:${storageKey}:${expiresAt.getTime()}`;
    const token = crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');

    const encodedKey = encodeURIComponent(storageKey);
    const url = `/api/v1/documents/download?key=${encodedKey}&token=${token}&expires=${expiresAt.getTime()}`;

    return {
      url,
      expiresAt,
      storageKey,
      token,
    };
  }

  /**
   * Verifies the authenticity and expiration of a presigned download token
   */
  verifyDownloadToken(storageKey: string, agencyId: string, userId: string, expires: number, token: string): boolean {
    if (Date.now() > expires) {
      throw new ForbiddenException('DOWNLOAD_EXPIRED: The requested download link has expired');
    }

    const payload = `${agencyId}:${userId}:${storageKey}:${expires}`;
    const expectedToken = crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');

    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expectedToken);

    if (tokenBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
      throw new ForbiddenException('DOWNLOAD_UNAUTHORIZED: Invalid download signature or unauthorized tamper detected');
    }

    return true;
  }
}

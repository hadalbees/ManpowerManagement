import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export const RATE_LIMIT_KEY = 'rate_limit';
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

interface ClientRequestRecord {
  timestamps: number[];
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  // In-memory sliding window request store
  private readonly clientStore = new Map<string, ClientRequestRecord>();
  private readonly defaultLimit = 60; // 60 requests
  private readonly defaultWindowMs = 60 * 1000; // 1 minute

  constructor(private readonly reflector: Reflector) {
    // Periodic cleanup of stale client keys every 5 minutes to prevent memory leaks
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.clientStore.entries()) {
        record.timestamps = record.timestamps.filter((ts) => now - ts < 10 * 60 * 1000);
        if (record.timestamps.length === 0) {
          this.clientStore.delete(key);
        }
      }
    }, 5 * 60 * 1000).unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const options =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || { limit: this.defaultLimit, windowMs: this.defaultWindowMs };

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    // Identifier: Authenticated user ID or remote client IP
    const clientKey = (req as any).user?.userId || (req as any).user?.id || req.ip || req.socket.remoteAddress || 'unknown-client';
    const trackingKey = `${clientKey}:${req.route?.path || req.baseUrl || req.path}`;
    const now = Date.now();

    let record = this.clientStore.get(trackingKey);
    if (!record) {
      record = { timestamps: [] };
      this.clientStore.set(trackingKey, record);
    }

    // Filter timestamps outside current sliding window
    record.timestamps = record.timestamps.filter((ts) => now - ts < options.windowMs);

    // Remaining limit
    const currentCount = record.timestamps.length;
    const remaining = Math.max(0, options.limit - currentCount);

    if (res && res.setHeader) {
      res.setHeader('X-RateLimit-Limit', options.limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + options.windowMs) / 1000));
    }

    if (currentCount >= options.limit) {
      const oldestTimestamp = record.timestamps[0];
      const retryAfterSec = Math.ceil((oldestTimestamp + options.windowMs - now) / 1000);
      if (res && res.setHeader) {
        res.setHeader('Retry-After', retryAfterSec);
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Limit of ${options.limit} requests per ${Math.round(options.windowMs / 1000)}s exceeded. Please try again in ${retryAfterSec}s.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.timestamps.push(now);
    return true;
  }
}

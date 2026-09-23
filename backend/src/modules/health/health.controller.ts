import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
export class HealthController {
  private readonly startupTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Basic liveness check: verifies process responsiveness
   */
  @Get()
  getLiveness() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startupTime) / 1000),
      version: '1.0.0',
    };
  }

  /**
   * Readiness check: verifies database connectivity and core system readiness
   * Sanitized output without database connection strings or sensitive internals
   */
  @Get('ready')
  async getReadiness(@Res() res: Response) {
    const startTime = Date.now();
    let databaseStatus = 'DOWN';
    let latencyMs = -1;

    try {
      // Execute lightweight query to verify active DB connection pool
      await this.prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'UP';
      latencyMs = Date.now() - startTime;
    } catch (err: any) {
      databaseStatus = 'DOWN';
    }

    const memoryUsage = process.memoryUsage();
    const isReady = databaseStatus === 'UP';

    const payload = {
      status: isReady ? 'READY' : 'NOT_READY',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startupTime) / 1000),
      checks: {
        database: {
          status: databaseStatus,
          latencyMs: databaseStatus === 'UP' ? latencyMs : undefined,
        },
        memory: {
          heapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
          heapTotalMb: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
          rssMb: Math.round(memoryUsage.rss / (1024 * 1024)),
        },
      },
    };

    return res.status(isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(payload);
  }
}

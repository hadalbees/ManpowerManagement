import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'An unexpected internal error occurred';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        errorMessage = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        errorMessage = resObj.message || exception.message;
        errorCode = resObj.error || this.mapStatusToErrorCode(status);

        // Capture class-validator array messages
        if (Array.isArray(resObj.message)) {
          errorDetails = resObj.message;
          errorMessage = resObj.message[0];
          errorCode = 'VALIDATION_FAILED';
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      // Ensure zero internal database, Prisma, or sensitive stack details leak
      errorMessage = 'A server processing error occurred';
      errorCode = 'SERVER_ERROR';
    }

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        ...(errorDetails ? { details: errorDetails } : {}),
      },
    });
  }

  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return 'HTTP_ERROR';
    }
  }
}

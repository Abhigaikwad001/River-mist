import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    // Resolve or generate traceable Request ID
    const requestId =
      request.requestId ||
      (request.headers && request.headers['x-request-id']) ||
      crypto.randomUUID();

    // Set X-Request-Id header on outgoing error response if headers not yet sent
    try {
      if (response.setHeader && !response.headersSent) {
        response.setHeader('X-Request-Id', requestId);
      }
    } catch {
      // Ignore if adapter handles headers differently
    }

    let httpStatus: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'An unexpected server error occurred. Please try again.';
    let errorName: string = 'Internal Server Error';

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message || 'Request failed';
        errorName = resObj.error || exception.name || 'Error';
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Prisma known request errors
      switch (exception.code) {
        case 'P2002': {
          // Unique constraint violation
          httpStatus = HttpStatus.CONFLICT;
          errorName = 'Conflict';
          const target = exception.meta?.target;
          const targetStr = Array.isArray(target) ? target.join(', ') : target ? String(target) : 'field';
          message = `A resource with this ${targetStr} already exists.`;
          break;
        }
        case 'P2025': {
          // Record not found
          httpStatus = HttpStatus.NOT_FOUND;
          errorName = 'Not Found';
          message = 'The requested resource was not found.';
          break;
        }
        case 'P2003': {
          // Foreign key constraint failed
          httpStatus = HttpStatus.BAD_REQUEST;
          errorName = 'Bad Request';
          message = 'The operation references an invalid or non-existent related record.';
          break;
        }
        case 'P2024': {
          // Connection pool timeout
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
          errorName = 'Service Unavailable';
          message = 'The database service is temporarily busy. Please retry shortly.';
          break;
        }
        default: {
          httpStatus = HttpStatus.BAD_REQUEST;
          errorName = 'Database Error';
          message = 'Unable to process database operation with the provided data.';
          break;
        }
      }
    } else if (
      exception instanceof Prisma.PrismaClientInitializationError ||
      (exception as any)?.name === 'PrismaClientInitializationError'
    ) {
      httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
      errorName = 'Service Unavailable';
      message = 'The database service is temporarily unavailable. Please retry in a moment.';
    } else if (
      exception instanceof Prisma.PrismaClientValidationError ||
      (exception as any)?.name === 'PrismaClientValidationError'
    ) {
      httpStatus = HttpStatus.BAD_REQUEST;
      errorName = 'Bad Request';
      message = 'Invalid data provided for database operation.';
    } else if (exception instanceof Error) {
      // Mask any accidentally included database connection URLs or credentials
      const sanitizedMsg = exception.message.replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***:***@');
      if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
        message = 'An unexpected server error occurred. Please try again.';
      }
      this.logger.error(`[${requestId}] [${request.method}] ${request.url} - Error: ${sanitizedMsg}`, exception.stack);
    }

    // Log 5xx errors internally with Request ID
    if (httpStatus >= 500) {
      this.logger.error(
        `[${requestId}] [${request.method}] ${request.url} -> ${httpStatus}`,
        exception instanceof Error ? exception.stack : String(exception)
      );
    } else if (httpStatus >= 400 && httpStatus !== 404) {
      this.logger.warn(`[${requestId}] [${request.method}] ${request.url} -> ${httpStatus}: ${JSON.stringify(message)}`);
    }

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      error: errorName,
      requestId,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}

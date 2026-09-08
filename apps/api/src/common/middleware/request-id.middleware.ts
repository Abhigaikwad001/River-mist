import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const rawIncomingId = (req.headers['x-request-id'] || req.headers['x-correlation-id']) as string | undefined;

    // Validate incoming ID: strictly alphanumeric, hyphen, underscore, max 64 chars
    const isValidIncoming =
      rawIncomingId &&
      typeof rawIncomingId === 'string' &&
      rawIncomingId.length > 0 &&
      rawIncomingId.length <= 64 &&
      /^[a-zA-Z0-9_\-]+$/.test(rawIncomingId);

    const requestId = isValidIncoming ? rawIncomingId : crypto.randomUUID();

    req.requestId = requestId;
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);

    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;

      // Safe structured log message omitting request body to protect customer PII and credentials
      const logMessage = `[${requestId}] ${req.method} ${req.originalUrl || req.url} ${statusCode} - ${duration}ms`;

      if (statusCode >= 500) {
        this.logger.error(logMessage);
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }
    });

    next();
  }
}

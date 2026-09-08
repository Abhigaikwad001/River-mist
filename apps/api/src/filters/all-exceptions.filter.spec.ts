import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockHttpAdapter: any;
  let mockHost: any;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      url: '/bookings',
      headers: { 'x-request-id': 'test-trace-id-123' },
      requestId: 'test-trace-id-123',
    };

    mockResponse = {
      setHeader: jest.fn(),
      headersSent: false,
    };

    mockHttpAdapter = {
      reply: jest.fn(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };

    filter = new AllExceptionsFilter({ httpAdapter: mockHttpAdapter } as any);
  });

  it('should format standard HttpException preserving status and message', () => {
    const exception = new HttpException('Invalid discount code', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      expect.objectContaining({
        statusCode: 400,
        message: 'Invalid discount code',
        requestId: 'test-trace-id-123',
        path: '/bookings',
      }),
      400
    );
  });

  it('should map Prisma P2002 unique constraint failure to 409 Conflict', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.9.1',
      meta: { target: ['bookingNumber'] },
    });

    filter.catch(prismaError, mockHost);

    expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      expect.objectContaining({
        statusCode: 409,
        error: 'Conflict',
        message: expect.stringContaining('bookingNumber'),
        requestId: 'test-trace-id-123',
      }),
      409
    );
  });

  it('should map Prisma P2025 record not found to 404 Not Found', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '7.9.1',
    });

    filter.catch(prismaError, mockHost);

    expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      expect.objectContaining({
        statusCode: 404,
        error: 'Not Found',
        message: 'The requested resource was not found.',
      }),
      404
    );
  });

  it('should return safe 500 message on unhandled exceptions without leaking stack trace', () => {
    const unhandledError = new Error('postgres://user:super_secret_password@db.supabase.co:5432/db connection dropped');

    filter.catch(unhandledError, mockHost);

    expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected server error occurred. Please try again.',
        requestId: 'test-trace-id-123',
      }),
      500
    );
  });
});

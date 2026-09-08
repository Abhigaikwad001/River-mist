import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
  });

  it('should accept and use a valid incoming x-request-id', () => {
    const validIncomingId = 'client-req-12345_ABC';
    const req: any = {
      headers: { 'x-request-id': validIncomingId },
      method: 'GET',
      url: '/packages',
    };
    const setHeaderMock = jest.fn();
    const onMock = jest.fn();
    const res: any = {
      setHeader: setHeaderMock,
      on: onMock,
      statusCode: 200,
    };
    const nextMock = jest.fn();

    middleware.use(req, res, nextMock);

    expect(req.requestId).toBe(validIncomingId);
    expect(setHeaderMock).toHaveBeenCalledWith('X-Request-Id', validIncomingId);
    expect(nextMock).toHaveBeenCalled();
  });

  it('should generate a UUID when incoming x-request-id is missing or invalid', () => {
    const invalidIncomingId = 'bad/injection\nheader';
    const req: any = {
      headers: { 'x-request-id': invalidIncomingId },
      method: 'GET',
      url: '/packages',
    };
    const setHeaderMock = jest.fn();
    const onMock = jest.fn();
    const res: any = {
      setHeader: setHeaderMock,
      on: onMock,
      statusCode: 200,
    };
    const nextMock = jest.fn();

    middleware.use(req, res, nextMock);

    expect(req.requestId).toBeDefined();
    expect(req.requestId).not.toBe(invalidIncomingId);
    expect(typeof req.requestId).toBe('string');
    expect(setHeaderMock).toHaveBeenCalledWith('X-Request-Id', req.requestId);
    expect(nextMock).toHaveBeenCalled();
  });
});

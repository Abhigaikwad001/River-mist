import { validateEnvironment } from './env.validator';

describe('validateEnvironment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should validate environment in test mode without throwing', () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://user:secret123@localhost:5432/testdb';

    const result = validateEnvironment();
    expect(result).toBeDefined();
    expect(result.isValid).toBe(true);
  });

  it('should detect missing JWT_SECRET in production mode and throw', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://user:secret123@db.supabase.co:5432/proddb';
    delete process.env.JWT_SECRET;

    expect(() => validateEnvironment()).toThrow(/JWT_SECRET environment variable is missing/);
  });

  it('should detect insecure default JWT_SECRET in production mode and throw', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://user:secret123@db.supabase.co:5432/proddb';
    process.env.JWT_SECRET = 'change-me';

    expect(() => validateEnvironment()).toThrow(/Insecure JWT_SECRET value/);
  });
});

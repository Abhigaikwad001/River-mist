import { Logger } from '@nestjs/common';

export interface EnvironmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): EnvironmentValidationResult {
  const logger = new Logger('EnvironmentValidator');
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. DATABASE_URL validation
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim() === '') {
    if (!isTest) {
      errors.push('DATABASE_URL is missing or empty.');
    } else {
      warnings.push('DATABASE_URL is not set in test environment.');
    }
  } else {
    // Masked log for operational visibility
    const maskedUrl = dbUrl.replace(/postgresql:\/\/[^@]+@/i, 'postgresql://***:***@');
    logger.log(`Database configuration loaded: ${maskedUrl.split('?')[0]}`);
  }

  // 2. JWT_SECRET validation
  const jwtSecret = process.env.JWT_SECRET;
  const insecureSecrets = ['change-me', 'fallback-secret-key-for-dev', 'secret', 'default-secret'];
  if (!jwtSecret || jwtSecret.trim() === '') {
    if (isProduction) {
      errors.push('FATAL: JWT_SECRET environment variable is missing in production.');
    } else {
      warnings.push('JWT_SECRET is missing; dev/test fallback is in use.');
    }
  } else if (isProduction && insecureSecrets.includes(jwtSecret.trim())) {
    errors.push(`FATAL: Insecure JWT_SECRET value '${jwtSecret}' used in production.`);
  } else if (isProduction && jwtSecret.trim().length < 16) {
    errors.push('FATAL: JWT_SECRET must be at least 16 characters in production.');
  }

  // 3. FRONTEND_URL validation
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl && isProduction) {
    warnings.push('FRONTEND_URL is not explicitly set in production; defaulting to http://localhost:3000.');
  }

  // 4. UPI Payment configuration (for exact-amount dynamic QR generation)
  const upiId = process.env.PAYMENT_UPI_ID || process.env.UPI_ID;
  if (!upiId) {
    if (isProduction) {
      warnings.push('PAYMENT_UPI_ID is not configured. UPI dynamic QR generation will fall back to cash instructions.');
    }
  }

  // 5. Razorpay Configuration
  const razorpayKey = process.env.RAZORPAY_KEY_ID;
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
  if ((!razorpayKey || !razorpaySecret) && isProduction) {
    warnings.push('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Online card/netbanking payments will fail.');
  }

  // 6. WhatsApp Configuration
  const waMode = process.env.WHATSAPP_MODE || 'HYBRID';
  const waPhone = process.env.WHATSAPP_BUSINESS_PHONE_NUMBER;
  if (!waPhone && isProduction) {
    warnings.push('WHATSAPP_BUSINESS_PHONE_NUMBER not set; default concierge number 919322759343 will be used.');
  }

  for (const warning of warnings) {
    logger.warn(`Config Warning: ${warning}`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      logger.error(`Config Error: ${error}`);
    }
    if (isProduction) {
      throw new Error(`Environment validation failed with ${errors.length} fatal error(s):\n${errors.join('\n')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

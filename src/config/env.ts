/**
 * Environment configuration
 */

import type { ServerConfig } from '../lib/types.js';

function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];
  
  if (!secret) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error(
        'JWT_SECRET environment variable is required in production. ' +
        'Please set a strong secret value.'
      );
    }
    // Development fallback with clear warning
    console.warn(
      '⚠️  WARNING: Using insecure development JWT secret. ' +
      'Set JWT_SECRET environment variable for production use.'
    );
    return 'dev-secret-INSECURE-for-development-only';
  }
  
  return secret;
}

export function loadConfig(): ServerConfig {
  return {
    port: parseInt(process.env['PORT'] ?? '4000', 10),
    cors: {
      // Parse comma-separated origins, fallback to localhost for development
      origin: (process.env['CORS_ORIGIN'] ?? 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
      credentials: true,
    },
    auth: {
      jwtSecret: getJwtSecret(),
      jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
    },
    rateLimit: {
      windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] ?? '60000', 10),
      maxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] ?? '100', 10),
    },
  };
}

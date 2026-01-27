/**
 * Gamification API Environment Configuration
 *
 * Defines and validates all required environment variables for the Gamification server.
 * This file should be imported at the very start of the server entry point.
 */

import { createEnvConfig, validators } from '@abeauvois/platform-env';
import type { EnvSchema } from '@abeauvois/platform-env';

const envSchema = {
    // Database (required for auth session validation and gamification data)
    DATABASE_URL: {
        description: 'PostgreSQL connection string',
        validate: validators.notEmpty,
    },
    APP_ENV: {
        description: 'Application environment (development or production)',
        default: 'development',
        validate: validators.oneOf(['development', 'production']),
    },

    // Server
    PORT: {
        description: 'Gamification server port',
        default: '3002',
        validate: validators.port,
    },
    GAMIFICATION_API_PORT: {
        description: 'Gamification server port (alias)',
        default: '3002',
        validate: validators.port,
    },
    GAMIFICATION_API_URL: {
        description: 'Gamification server URL',
        default: 'http://localhost:3002',
    },

    // Auth (must match API server for session sharing)
    BETTER_AUTH_SECRET: {
        description: 'Secret for signing auth tokens (must be same as API server)',
        validate: validators.notEmpty,
    },
    BETTER_AUTH_URL: {
        description: 'Base URL for better-auth',
        default: 'http://localhost:3000',
    },

    // Client URLs (for CORS and trusted origins)
    CLIENT_URL: {
        description: 'Dashboard client URL',
        default: 'http://localhost:5000',
    },
    TRADING_CLIENT_URL: {
        description: 'Trading client URL',
        default: 'http://localhost:5001',
    },
    API_URL: {
        description: 'API server URL',
        default: 'http://localhost:3000',
    },
    TRADING_SERVER_URL: {
        description: 'Trading server URL',
        default: 'http://localhost:3001',
    },
    CLIENT_URLS: {
        description: 'Additional allowed client URLs (comma-separated)',
        required: false,
        default: '',
    },

    // Stripe (required for payment processing)
    STRIPE_SECRET_KEY: {
        description: 'Stripe secret key for payment processing',
        validate: validators.notEmpty,
    },
    STRIPE_WEBHOOK_SECRET: {
        description: 'Stripe webhook signing secret',
        validate: validators.notEmpty,
    },
} satisfies EnvSchema;

/**
 * Validated environment configuration for the Gamification server.
 * Throws on startup if required variables are missing.
 */
export const env = createEnvConfig(envSchema, {
    appName: 'Gamification API',
});

// Re-export for type inference
export type GamificationEnv = typeof env;

/**
 * Trading Server Environment Configuration
 *
 * Defines and validates all required environment variables for the Trading server.
 * This file should be imported at the very start of the server entry point.
 */

import { createEnvConfig, validators, type EnvSchema } from '@abeauvois/platform-env';

const envSchema = {
    // Database (required for auth session validation)
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
        description: 'Trading server port',
        default: '3001',
        validate: validators.port,
    },
    TRADING_SERVER_PORT: {
        description: 'Trading server port (alias)',
        default: '3001',
        validate: validators.port,
    },
    TRADING_SERVER_URL: {
        description: 'Trading server URL',
        default: 'http://localhost:3001',
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
    TRADING_CLIENT_PORT: {
        description: 'Trading client port',
        default: '5001',
        validate: validators.port,
    },
    API_URL: {
        description: 'API server URL',
        default: 'http://localhost:3000',
    },
    API_PORT: {
        description: 'API server port',
        default: '3000',
        validate: validators.port,
    },
    GAMIFICATION_API_URL: {
        description: 'Gamification API URL for credit checks',
        default: 'http://localhost:3002',
    },
    CLIENT_URLS: {
        description: 'Additional allowed client URLs (comma-separated)',
        required: false,
        default: '',
    },

    // Binance API (optional - authenticated trading routes disabled if not set)
    BINANCE_API_KEY: {
        description: 'Binance API key for trading operations',
        required: false,
        default: '',
    },
    BINANCE_API_SECRET: {
        description: 'Binance API secret for trading operations',
        required: false,
        default: '',
    },
} satisfies EnvSchema;

/**
 * Validated environment configuration for the Trading server.
 * Throws on startup if required variables are missing.
 */
export const env = createEnvConfig(envSchema, {
    appName: 'Trading Server',
});

/**
 * Check if Binance credentials are configured
 */
export function hasBinanceCredentials(): boolean {
    return Boolean(env.BINANCE_API_KEY && env.BINANCE_API_SECRET);
}

// Re-export for type inference
export type TradingEnv = typeof env;

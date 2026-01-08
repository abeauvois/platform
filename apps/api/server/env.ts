/**
 * API Server Environment Configuration
 *
 * Defines and validates all required environment variables for the API server.
 * This file should be imported at the very start of the server entry point.
 */

import { createEnvConfig, validators } from '@platform/env';
import type { EnvSchema } from '@platform/env';

const envSchema = {
    // Database
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
        description: 'API server port',
        default: '3000',
        validate: validators.port,
    },
    API_PORT: {
        description: 'API server port (alias)',
        default: '3000',
        validate: validators.port,
    },

    // Auth
    BETTER_AUTH_SECRET: {
        description: 'Secret for signing auth tokens (must be same across all servers)',
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
    DASHBOARD_URL: {
        description: 'Dashboard URL (alias for CLIENT_URL)',
        default: 'http://localhost:5000',
    },
    DASHBOARD_PORT: {
        description: 'Dashboard client port',
        default: '5000',
        validate: validators.port,
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
    CLIENT_URLS: {
        description: 'Additional allowed client URLs (comma-separated)',
        required: false,
        default: '',
    },

    // Optional service credentials (for config endpoint)
    ANTHROPIC_API_KEY: {
        description: 'Anthropic API key for AI features',
        required: false,
        default: '',
    },
    NOTION_INTEGRATION_TOKEN: {
        description: 'Notion integration token',
        required: false,
        default: '',
    },
    NOTION_DATABASE_ID: {
        description: 'Notion database ID',
        required: false,
        default: '',
    },
    TWITTER_BEARER_TOKEN: {
        description: 'Twitter API bearer token',
        required: false,
        default: '',
    },
    GMAIL_CLIENT_ID: {
        description: 'Gmail OAuth client ID',
        required: false,
        default: '',
    },
    GMAIL_CLIENT_SECRET: {
        description: 'Gmail OAuth client secret',
        required: false,
        default: '',
    },
    GMAIL_REFRESH_TOKEN: {
        description: 'Gmail OAuth refresh token',
        required: false,
        default: '',
    },
    MY_EMAIL_ADDRESS: {
        description: 'Email address for Gmail integration',
        required: false,
        default: '',
    },
} satisfies EnvSchema;

/**
 * Validated environment configuration for the API server.
 * Throws on startup if required variables are missing.
 */
export const env = createEnvConfig(envSchema, {
    appName: 'API Server',
});

// Re-export for type inference
export type ApiEnv = typeof env;

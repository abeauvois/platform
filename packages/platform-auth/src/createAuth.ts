import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { openAPI, bearer } from 'better-auth/plugins';

interface CreateAuthConfig {
    db: any;
    schema: any;
    provider: 'pg' | 'mysql' | 'sqlite';
    trustedOrigins: string[];
}

// Shared secret for session cookie signing - must be same across all servers
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET;

if (!AUTH_SECRET) {
    console.warn('[Auth] WARNING: AUTH_SECRET not set. Sessions will not work across servers. Set AUTH_SECRET in your .env file.');
}

/**
 * Factory function to create a configured better-auth instance
 * Provides consistent auth configuration across all apps in the monorepo
 *
 * @param config - Configuration object containing database, schema, and environment settings
 * @returns Configured better-auth instance
 */
export function createAuth(config: CreateAuthConfig) {
    const isProduction = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';

    return betterAuth({
        basePath: '/api/auth',
        secret: AUTH_SECRET,
        database: drizzleAdapter(config.db, {
            provider: config.provider,
            schema: config.schema,
        }),
        emailAndPassword: {
            enabled: true,
        },
        trustedOrigins: config.trustedOrigins,
        plugins: [
            openAPI(),
            bearer(), // Enable bearer token auth for cross-service authentication
        ],
        advanced: {
            // Enable secure cookies in production for cross-origin requests
            useSecureCookies: isProduction,
            // Set SameSite=None for cross-origin cookie sharing
            defaultCookieAttributes: isProduction ? {
                sameSite: 'none',
                secure: true,
                httpOnly: true,
            } : undefined,
        },
    });
}

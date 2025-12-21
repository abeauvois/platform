import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { openAPI } from 'better-auth/plugins';

interface CreateAuthConfig {
    db: any;
    schema: any;
    provider: 'pg' | 'mysql' | 'sqlite';
    trustedOrigins: string[];
}

/**
 * Factory function to create a configured better-auth instance
 * Provides consistent auth configuration across all apps in the monorepo
 * 
 * @param config - Configuration object containing database, schema, and environment settings
 * @returns Configured better-auth instance
 */
export function createAuth(config: CreateAuthConfig) {
    return betterAuth({
        basePath: '/api/auth',
        database: drizzleAdapter(config.db, {
            provider: config.provider,
            schema: config.schema,
        }),
        emailAndPassword: {
            enabled: true,
        },
        trustedOrigins: config.trustedOrigins,
        plugins: [openAPI()],
    });
}

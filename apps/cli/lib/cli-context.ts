import type { ILogger, IConfigProvider } from '@platform/platform-domain';
import { PlatformApiClient, ApiConfigProvider } from '@platform/sdk';
import { AuthManager } from './AuthManager.js';
import { createClackLogger } from './clack-logger.js';

/**
 * Default Platform API URL
 */
const DEFAULT_API_URL = 'http://localhost:3000';

/**
 * Get the Platform API URL from environment or default
 */
export function getApiUrl(): string {
    return process.env.PLATFORM_API_URL || DEFAULT_API_URL;
}

/**
 * CLI Context - Provides authenticated access to platform services
 *
 * Encapsulates:
 * - Logger (clack-based)
 * - Authentication (via AuthManager)
 * - API client (authenticated PlatformApiClient)
 * - Configuration (fetched from platform API)
 */
export interface CliContext {
    logger: ILogger;
    apiClient: PlatformApiClient;
    config: IConfigProvider;
    baseUrl: string;
    userId: string;
    email: string;
}

export interface CreateCliContextOptions {
    /** Skip loading config from API (faster startup) */
    skipConfig?: boolean;
}

/**
 * Create an authenticated CLI context
 *
 * This is the main entry point for CLI commands that need platform access.
 * It handles:
 * 1. Creating a clack-based logger
 * 2. Authenticating the user (prompts if needed)
 * 3. Creating an authenticated API client
 * 4. Loading configuration from the platform API
 *
 * @throws Error if authentication fails
 *
 * @example
 * ```typescript
 * const ctx = await createCliContext();
 *
 * // Use the API client
 * const workflow = ctx.apiClient.workflow.create('gmail', { filter });
 *
 * // Get config values
 * const email = ctx.config.getOptional('MY_EMAIL_ADDRESS');
 * ```
 */
export async function createCliContext(
    options: CreateCliContextOptions = {}
): Promise<CliContext> {
    const baseUrl = getApiUrl();
    const logger = createClackLogger();

    // Authenticate user
    const authManager = new AuthManager({ baseUrl, logger });
    const credentials = await authManager.login();

    if (!credentials) {
        throw new Error('Authentication failed. Please check your credentials and try again.');
    }

    // Create authenticated API client
    const apiClient = new PlatformApiClient({
        baseUrl,
        sessionToken: credentials.sessionToken,
        logger,
    });

    // Load configuration from platform API
    let config: IConfigProvider;
    if (options.skipConfig) {
        // Create a stub config provider that returns empty values
        config = {
            get: () => { throw new Error('Config not loaded'); },
            getOptional: (_, defaultValue = '') => defaultValue,
            has: () => false,
            isLoaded: () => false,
            keys: () => [],
            load: async () => {},
            reload: async () => {},
        };
    } else {
        const apiConfig = new ApiConfigProvider({
            baseUrl,
            sessionToken: credentials.sessionToken,
            logger,
        });
        await apiConfig.load();
        config = apiConfig;
    }

    return {
        logger,
        apiClient,
        config,
        baseUrl,
        userId: credentials.user?.id || '',
        email: credentials.user?.email || '',
    };
}

/**
 * Get the default email address for filtering
 * Uses config from platform or falls back to authenticated user's email
 */
export function getDefaultEmail(ctx: CliContext): string | undefined {
    // Try config first (MY_EMAIL_ADDRESS from .env on server)
    if (ctx.config.isLoaded() && ctx.config.has('MY_EMAIL_ADDRESS')) {
        return ctx.config.get('MY_EMAIL_ADDRESS');
    }
    // Fall back to authenticated user's email
    return ctx.email || undefined;
}

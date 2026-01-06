import { ApiConfigProvider } from '@platform/sdk';
import type { IConfigProvider, ILogger } from '@platform/platform-domain';
import { AuthManager } from './AuthManager';
import { CliuiLogger } from './CliuiLogger';

/**
 * Get default API URL from environment or fallback
 */
const getDefaultApiUrl = () =>
    process.env.PLATFORM_API_URL
    || process.env.API_URL
    || `http://localhost:${process.env.API_PORT || '3000'}`;

/**
 * Silent logger for config loading (no output)
 */
const silentLogger: ILogger = {
    info: () => {},
    warning: () => {},
    error: () => {},
    debug: () => {},
    await: () => ({
        start: () => {},
        update: () => {},
        stop: () => {},
    }),
};

/**
 * Load configuration from the Platform API
 *
 * The CLI no longer has direct access to .env files.
 * All configuration must be fetched from the API server.
 *
 * Requires the user to be authenticated first.
 *
 * @param logger - Optional logger for verbose output
 */
export async function loadConfig(logger?: ILogger): Promise<IConfigProvider> {
    const apiUrl = getApiUrl();
    const log = logger ?? silentLogger;

    // Get session token from AuthManager
    const authManager = new AuthManager({
        baseUrl: apiUrl,
        logger: silentLogger, // Use silent logger for auth check
    });

    const session = authManager.getCurrentSession();

    if (!session) {
        throw new Error(
            'Not authenticated. Please run "cli auth login" first to authenticate with the platform.'
        );
    }

    log.info('Loading configuration from API...');

    const config = new ApiConfigProvider({
        baseUrl: apiUrl,
        sessionToken: session.sessionToken,
        logger: log,
    });

    await config.load();

    log.info(`Loaded ${config.keys().length} configuration keys`);

    return config;
}

/**
 * Get the Platform API URL from environment or default
 */
export function getApiUrl(): string {
    return getDefaultApiUrl();
}

/**
 * Create a default CLI logger
 */
export function createLogger(): ILogger {
    return new CliuiLogger();
}

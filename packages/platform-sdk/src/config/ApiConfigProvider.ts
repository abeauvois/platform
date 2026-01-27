import type { IConfigProvider, ILogger } from '@abeauvois/platform-domain';
import { PlatformApiClient } from '../PlatformApiClient.js';

interface ApiConfigProviderOptions {
    baseUrl: string;
    sessionToken: string;
    logger?: ILogger;
}

/**
 * Silent logger for when no logger is provided
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
 * Configuration provider that fetches config from the Platform API
 * Implements IConfigProvider port from domain layer
 *
 * Usage:
 * ```typescript
 * const config = new ApiConfigProvider({
 *   baseUrl: 'http://localhost:3000',
 *   sessionToken: 'your-session-token',
 * });
 * await config.load();
 * const apiKey = config.get('ANTHROPIC_API_KEY');
 * ```
 */
export class ApiConfigProvider implements IConfigProvider {
    private config: Map<string, string> = new Map();
    private client: PlatformApiClient;
    private loaded = false;

    constructor(options: ApiConfigProviderOptions) {
        this.client = new PlatformApiClient({
            baseUrl: options.baseUrl,
            sessionToken: options.sessionToken,
            logger: options.logger ?? silentLogger,
        });
    }

    /**
     * Load configuration from the API
     * Fetches all available config values and caches them locally
     */
    async load(): Promise<void> {
        try {
            const response = await this.client.config.fetchAll();

            this.config.clear();
            for (const [key, value] of Object.entries(response.config)) {
                this.config.set(key, value);
            }

            this.loaded = true;
        } catch (error) {
            throw new Error(
                `Failed to load config from API: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Get a required configuration value
     * @throws Error if the key is not found or config not loaded
     */
    get(key: string): string {
        if (!this.loaded) {
            throw new Error(
                'Configuration not loaded. Call load() first.'
            );
        }

        const value = this.config.get(key);
        if (value === undefined) {
            throw new Error(`Configuration key not found: ${key}`);
        }
        return value;
    }

    /**
     * Get an optional configuration value with a default
     */
    getOptional(key: string, defaultValue: string = ''): string {
        if (!this.loaded) {
            return defaultValue;
        }
        return this.config.get(key) ?? defaultValue;
    }

    /**
     * Check if a configuration key exists
     */
    has(key: string): boolean {
        return this.config.has(key);
    }

    /**
     * Check if configuration has been loaded
     */
    isLoaded(): boolean {
        return this.loaded;
    }

    /**
     * Get all loaded configuration keys
     */
    keys(): string[] {
        return Array.from(this.config.keys());
    }

    /**
     * Reload configuration from the API
     */
    async reload(): Promise<void> {
        this.loaded = false;
        await this.load();
    }
}

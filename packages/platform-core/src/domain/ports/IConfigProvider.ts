/**
 * Port for configuration providers
 *
 * This interface defines how configuration values are accessed.
 * Implementations can load from .env files, environment variables,
 * remote config services, etc.
 */
export interface IConfigProvider {
    /**
     * Load configuration from the source
     * @param options - Provider-specific options (e.g., file path)
     */
    load(options?: unknown): Promise<void>;

    /**
     * Reload configuration from the source
     */
    reload(): Promise<void>;

    /**
     * Get a required configuration value
     * @param key - The configuration key
     * @throws Error if the key is not found
     */
    get(key: string): string;

    /**
     * Get an optional configuration value with a default
     * @param key - The configuration key
     * @param defaultValue - Value to return if key is not found
     */
    getOptional(key: string, defaultValue?: string): string;

    /**
     * Check if a configuration key exists
     * @param key - The configuration key
     */
    has(key: string): boolean;

    /**
     * Check if configuration has been loaded
     */
    isLoaded(): boolean;

    /**
     * Get all loaded configuration keys
     */
    keys(): Array<string>;
}

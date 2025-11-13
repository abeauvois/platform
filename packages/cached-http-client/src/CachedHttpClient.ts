import { ILogger } from './ILogger.js';

/**
 * Options for configuring the CachedHttpClient
 */
export interface CachedHttpClientOptions {
    /**
     * Minimum time between requests in milliseconds
     * @default 1000
     */
    throttleMs?: number;

    /**
     * Maximum number of retry attempts
     * @default 2
     */
    retries?: number;

    /**
     * Cache Time-To-Live in milliseconds (0 = no expiration)
     * @default 0 (no expiration)
     */
    cacheTtl?: number;

    /**
     * Custom retry delay function
     * @default Exponential backoff: min(1000 * 2^attempt, 5000)
     */
    retryDelay?: (attempt: number) => number;

    /**
     * Function to determine if an error should be retried
     * @default Retries on 5xx errors, not on 4xx (except 429)
     */
    shouldRetry?: (error: any, attempt: number) => boolean;
}

/**
 * Cache entry with optional expiration
 */
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

/**
 * Generic HTTP client with built-in caching, throttling, and retry logic
 * 
 * Features:
 * - Request throttling to prevent rate limiting
 * - In-memory caching with optional TTL
 * - Configurable retry logic with exponential backoff
 * - Rate limit tracking and handling
 * 
 * @template T The type of data being fetched
 * 
 * @example
 * ```typescript
 * const client = new CachedHttpClient<string>(logger, {
 *   throttleMs: 1000,
 *   retries: 3,
 *   cacheTtl: 3600000 // 1 hour
 * });
 * 
 * const result = await client.fetch(
 *   'unique-key',
 *   async () => {
 *     const response = await fetch('https://api.example.com/data');
 *     return response.json();
 *   }
 * );
 * ```
 */
export class CachedHttpClient<T = any> {
    private readonly cache = new Map<string, CacheEntry<T>>();
    private lastRequestTime = 0;
    private rateLimitResetTime = 0;
    private readonly options: Required<CachedHttpClientOptions>;

    constructor(
        private readonly logger: ILogger,
        options: CachedHttpClientOptions = {}
    ) {
        // Set defaults
        this.options = {
            throttleMs: options.throttleMs ?? 1000,
            retries: options.retries ?? 2,
            cacheTtl: options.cacheTtl ?? 0,
            retryDelay: options.retryDelay ?? this.exponentialBackoff,
            shouldRetry: options.shouldRetry ?? this.defaultShouldRetry,
        };
    }

    /**
     * Fetch data with caching, throttling, and retry logic
     * 
     * @param key Unique cache key for this request
     * @param fetcher Function that performs the actual HTTP request
     * @param options Optional per-request options to override defaults
     * @returns The fetched data or null if all attempts fail
     */
    async fetch(
        key: string,
        fetcher: () => Promise<T>,
        options?: Partial<CachedHttpClientOptions>
    ): Promise<T | null> {
        const opts = { ...this.options, ...options };

        try {
            // Check cache first
            const cached = this.getFromCache(key, opts.cacheTtl);
            if (cached !== null) {
                this.logger.info('💾 Using cached data');
                return cached;
            }

            // Check if we're rate limited
            const now = Date.now();
            if (this.rateLimitResetTime > now) {
                const waitSeconds = Math.ceil((this.rateLimitResetTime - now) / 1000);
                this.logger.warning(`Rate limited. Skipping (resets in ${waitSeconds}s)`);
                return null;
            }

            // Fetch with retry logic
            const data = await this.fetchWithRetry(fetcher, opts);

            // Cache successful result
            if (data !== null) {
                this.setCache(key, data);
            }

            return data;
        } catch (error) {
            this.logger.error(`Fetch error: ${error instanceof Error ? error.message : error}`);
            return null;
        }
    }

    /**
     * Fetch with retry logic and throttling
     */
    private async fetchWithRetry(
        fetcher: () => Promise<T>,
        options: Required<CachedHttpClientOptions>
    ): Promise<T | null> {
        // Throttling: ensure minimum time between requests
        await this.applyThrottle(options.throttleMs);

        for (let attempt = 0; attempt <= options.retries; attempt++) {
            try {
                // Add delay between retries
                if (attempt > 0) {
                    const delayMs = options.retryDelay(attempt);
                    this.logger.info(`⏳ Retry ${attempt}/${options.retries} after ${delayMs}ms...`);
                    await this.delay(delayMs);
                }

                // Track request time for throttling
                this.lastRequestTime = Date.now();

                // Execute the fetcher
                const data = await fetcher();
                return data;
            } catch (error: any) {
                // Check if this is a rate limit error (429)
                if (this.isRateLimitError(error)) {
                    this.handleRateLimitError(error);
                    return null;
                }

                // Check if we should retry
                if (attempt < options.retries && options.shouldRetry(error, attempt)) {
                    this.logger.warning(`Request failed (attempt ${attempt + 1}/${options.retries + 1}): ${error.message}`);
                    continue;
                }

                // Last attempt or not retryable
                if (attempt === options.retries) {
                    this.logger.error(`Request failed after ${options.retries + 1} attempts: ${error.message}`);
                    throw error;
                }

                return null;
            }
        }

        return null;
    }

    /**
     * Apply throttling delay if needed
     */
    private async applyThrottle(throttleMs: number): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (this.lastRequestTime > 0 && timeSinceLastRequest < throttleMs) {
            const waitTime = throttleMs - timeSinceLastRequest;
            this.logger.info(`⏳ Throttling: waiting ${waitTime}ms before request...`);
            await this.delay(waitTime);
        }
    }

    /**
     * Check if error is a rate limit error
     */
    private isRateLimitError(error: any): boolean {
        return error.status === 429 || error.statusCode === 429;
    }

    /**
     * Handle rate limit error by extracting reset time
     */
    private handleRateLimitError(error: any): void {
        const resetTime = error.headers?.get?.('x-rate-limit-reset') ||
            error.response?.headers?.['x-rate-limit-reset'];

        if (resetTime) {
            this.rateLimitResetTime = parseInt(resetTime) * 1000;
            const waitSeconds = Math.ceil((this.rateLimitResetTime - Date.now()) / 1000);
            this.logger.warning(`Rate limited. Resets in ${waitSeconds} seconds`);
        } else {
            this.logger.warning('Rate limited. Try again later');
        }
    }

    /**
     * Get data from cache if not expired
     */
    private getFromCache(key: string, ttl: number): T | null {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }

        // Check if expired (ttl = 0 means no expiration)
        if (ttl > 0) {
            const age = Date.now() - entry.timestamp;
            if (age > ttl) {
                this.cache.delete(key);
                return null;
            }
        }

        return entry.data;
    }

    /**
     * Store data in cache
     */
    private setCache(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    /**
     * Clear a specific cache entry
     */
    clearCache(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clearAllCache(): void {
        this.cache.clear();
    }

    /**
     * Get the rate limit reset time
     */
    getRateLimitResetTime(): number {
        return this.rateLimitResetTime;
    }

    /**
     * Check if currently rate limited
     */
    isRateLimited(): boolean {
        // Clear expired rate limit
        if (this.rateLimitResetTime > 0 && this.rateLimitResetTime <= Date.now()) {
            this.rateLimitResetTime = 0;
        }
        return this.rateLimitResetTime > Date.now();
    }

    /**
     * Clear the rate limit (for testing or after waiting)
     */
    clearRateLimit(): void {
        this.rateLimitResetTime = 0;
    }

    /**
     * Default exponential backoff strategy
     */
    private exponentialBackoff(attempt: number): number {
        return Math.min(1000 * Math.pow(2, attempt - 1), 5000);
    }

    /**
     * Default retry strategy: retry on 5xx errors and 429, not on 4xx
     */
    private defaultShouldRetry(error: any, attempt: number): boolean {
        const status = error.status || error.statusCode;

        // Don't retry on auth errors
        if (status === 401 || status === 403) {
            return false;
        }

        // Retry on rate limits (handled separately)
        if (status === 429) {
            return false; // Handled by rate limit logic
        }

        // Retry on server errors
        if (status >= 500) {
            return true;
        }

        // Don't retry on other 4xx errors
        if (status >= 400 && status < 500) {
            return false;
        }

        // Retry on network errors
        return true;
    }

    /**
     * Simple delay utility
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Port: Defines interface for rate-limited content fetching
 */
export interface IRateLimitedClient {
    /**
     * Fetches content from a URL
     * @param url The URL to fetch content from
     * @returns Content if successful, null otherwise
     */
    fetchContent(url: string): Promise<string | null>;

    /**
     * Get the rate limit reset time in milliseconds
     * @returns The timestamp when the rate limit will reset
     */
    getRateLimitResetTime(): number;

    /**
     * Check if currently rate limited
     * @returns True if rate limited, false otherwise
     */
    isRateLimited(): boolean;

    /**
     * Clear the rate limit (for testing or after waiting)
     */
    clearRateLimit(): void;
}

/**
 * Port: Defines interface for scraping tweet content
 */
export interface ITwitterClient {
    /**
     * Fetches tweet content from a Twitter/X URL
     * @param url The tweet URL (twitter.com or x.com)
     * @returns Tweet content/text if successful, null otherwise
     */
    fetchTweetContent(url: string): Promise<string | null>;

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

import { ITweetScraper } from '../../domain/ports/ITweetScraper.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { CachedHttpClient } from './CachedHttpClient.js';

/**
 * Adapter: Implements tweet scraping using Twitter API v2 with Bearer Token
 * Uses CachedHttpClient for built-in caching, throttling, and retry logic
 * 
 * Features:
 * - Request throttling to prevent hitting rate limits (via CachedHttpClient)
 * - Automatic rate limit detection and tracking (via CachedHttpClient)
 * - In-memory caching of tweet content (via CachedHttpClient)
 * - Exponential backoff retry logic (via CachedHttpClient)
 * - Support for t.co URL resolution
 * 
 * Rate Limit Configuration:
 * The minRequestIntervalMs parameter controls the minimum time between API requests.
 * Recommended values by X API tier:
 * - Free:       60000ms (1 min) - 1 request per 15 mins
 * - Basic:      4000ms (4 sec) - ~15 requests per 15 mins  
 * - Pro:        1000ms (1 sec) - 450-900 requests per 15 mins
 * - Enterprise: 100ms (0.1 sec) - Very high limits
 * 
 * Example usage:
 * ```typescript
 * // For Basic tier (conservative)
 * const scraper = new TwitterScraper(bearerToken, logger, 4000);
 * 
 * // For Pro tier (default)
 * const scraper = new TwitterScraper(bearerToken, logger); // Uses 1000ms default
 * ```
 */
export class TwitterScraper implements ITweetScraper {
    private readonly httpClient: CachedHttpClient<string>;

    constructor(
        private readonly bearerToken: string,
        private readonly logger: ILogger,
        minRequestIntervalMs: number = 1000 // Default: 1 second between requests
    ) {
        // Initialize the generic HTTP client with Twitter-specific settings
        this.httpClient = new CachedHttpClient<string>(logger, {
            throttleMs: minRequestIntervalMs,
            retries: 2,
            cacheTtl: 0, // No expiration for tweet cache
        });
    }

    /**
     * Get the rate limit reset time in milliseconds
     */
    getRateLimitResetTime(): number {
        return this.httpClient.getRateLimitResetTime();
    }

    /**
     * Check if currently rate limited
     */
    isRateLimited(): boolean {
        return this.httpClient.isRateLimited();
    }

    /**
     * Clear the rate limit (for testing or after waiting)
     */
    clearRateLimit(): void {
        this.httpClient.clearRateLimit();
    }

    async fetchTweetContent(url: string): Promise<string | null> {
        try {
            // If it's a t.co link, resolve it first
            let resolvedUrl = url;
            if (url.includes('t.co/')) {
                this.logger.info('🔗 Resolving t.co shortened URL...');
                const resolved = await this.resolveShortUrl(url);
                if (resolved) {
                    resolvedUrl = resolved;
                    this.logger.info(`✓ Resolved to: ${resolvedUrl}`);
                } else {
                    this.logger.warning('Could not resolve t.co URL');
                    return null;
                }
            }

            // Extract tweet ID from URL
            const tweetId = this.extractTweetId(resolvedUrl);
            if (!tweetId) {
                this.logger.warning(`Could not extract tweet ID from URL: ${resolvedUrl}`);
                return null;
            }

            // Use CachedHttpClient to fetch with caching, throttling, and retry logic
            const content = await this.httpClient.fetch(
                tweetId,
                async () => await this.fetchTweetFromApi(tweetId)
            );

            return content;
        } catch (error) {
            this.logger.error(`Error fetching tweet: ${error instanceof Error ? error.message : error}`);
            return null;
        }
    }

    /**
     * Fetch tweet from Twitter API
     * This method is passed to CachedHttpClient as the fetcher function
     */
    private async fetchTweetFromApi(tweetId: string): Promise<string> {
        const apiUrl = `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=text,author_id,created_at`;

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${this.bearerToken}`,
            },
        });

        // Create error with status for CachedHttpClient to handle
        if (!response.ok) {
            const error: any = new Error(`Twitter API error: ${response.status} - ${response.statusText}`);
            error.status = response.status;
            error.headers = response.headers;
            throw error;
        }

        const data: any = await response.json();

        if (data.data && data.data.text) {
            return data.data.text;
        }

        throw new Error('No tweet text found in response');
    }

    /**
     * Extracts tweet ID from Twitter/X URL
     * Supports formats:
     * - https://twitter.com/user/status/1234567890
     * - https://x.com/user/status/1234567890
     */
    private extractTweetId(url: string): string | null {
        try {
            const patterns = [
                /(?:twitter\.com|x\.com)\/(?:\w+)\/status\/(\d+)/,
                /(?:twitter\.com|x\.com)\/.*\/status\/(\d+)/,
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Resolves a shortened t.co URL to its final destination
     */
    private async resolveShortUrl(shortUrl: string): Promise<string | null> {
        try {
            // Use HEAD request to follow redirects without downloading content
            const response = await fetch(shortUrl, {
                method: 'HEAD',
                redirect: 'follow',
            });

            // The final URL after redirects
            const finalUrl = response.url;

            // Check if it's a Twitter/X URL
            if (finalUrl.includes('twitter.com/') || finalUrl.includes('x.com/')) {
                return finalUrl;
            }

            return null;
        } catch (error) {
            this.logger.warning(`Error resolving URL: ${error instanceof Error ? error.message : error}`);
            return null;
        }
    }

    /**
     * Checks if a URL is a Twitter/X URL or t.co link
     */
    static isTweetUrl(url: string): boolean {
        return url.includes('twitter.com/') || url.includes('x.com/') || url.includes('t.co/');
    }
}

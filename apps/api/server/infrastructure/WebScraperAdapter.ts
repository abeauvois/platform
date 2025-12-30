import { CachedHttpClient } from '@platform/cached-http-client';
import { type IWebScraper, type ILogger } from '@platform/platform-domain';

// LinkedIn post content selector
const LINKEDIN_CONTENT_SELECTOR = '#ember35 > div > div > div.fie-impression-container';

/**
 * Adapter implementing IWebScraper using CachedHttpClient
 *
 * Features:
 * - HTTP fetching with rate limiting and retries
 * - HTML to text conversion
 * - Caching to avoid re-fetching same URLs
 * - Site-specific content extraction (e.g., LinkedIn)
 */
export class WebScraperAdapter implements IWebScraper {
    private readonly httpClient: CachedHttpClient<string>;

    constructor(
        private readonly logger: ILogger,
        options?: {
            throttleMs?: number;
            retries?: number;
            cacheTtl?: number;
        }
    ) {
        this.httpClient = new CachedHttpClient<string>(logger, {
            throttleMs: options?.throttleMs ?? 1000,
            retries: options?.retries ?? 2,
            cacheTtl: options?.cacheTtl ?? 3600000, // 1 hour default cache
        });
    }

    async scrape(url: string): Promise<string | null> {
        try {
            const isLinkedInPost = this.isLinkedInPostUrl(url);

            const content = await this.httpClient.fetch(url, async () => {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; BookmarkEnricher/1.0)',
                        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    },
                });

                if (!response.ok) {
                    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                    (error as any).status = response.status;
                    throw error;
                }

                const html = await response.text();

                // For LinkedIn, extract content from specific selector
                if (isLinkedInPost) {
                    const linkedInContent = this.extractBySelector(html, LINKEDIN_CONTENT_SELECTOR);
                    if (linkedInContent) {
                        return this.extractTextContent(linkedInContent);
                    }
                    this.logger.warning(`LinkedIn selector not found, falling back to full page extraction for ${url}`);
                }

                return this.extractTextContent(html);
            });

            return content;
        } catch (error) {
            this.logger.error(`Failed to scrape ${url}: ${error instanceof Error ? error.message : error}`);
            return null;
        }
    }

    private isLinkedInPostUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.hostname.includes('linkedin.com') && parsedUrl.pathname.includes('/posts');
        } catch {
            return false;
        }
    }

    /**
     * Extract content from HTML by CSS selector (basic implementation)
     * Supports id selectors (#id), class selectors (.class), and tag selectors
     */
    private extractBySelector(html: string, selector: string): string | null {
        // Parse the selector - handle compound selectors like "#ember35 > div > div > div.fie-impression-container"
        // For this specific case, we'll look for the fie-impression-container class
        const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)(?:\s|$|>)/);
        if (classMatch) {
            const className = classMatch[1];
            // Find element with this class and extract its content
            const regex = new RegExp(`<[^>]+class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)(?=<\\/div>\\s*<\\/div>\\s*<\\/div>|$)`, 'i');
            const match = html.match(regex);
            if (match) {
                return match[0];
            }
        }

        // Try ID selector
        const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
        if (idMatch) {
            const id = idMatch[1];
            const regex = new RegExp(`<[^>]+id="${id}"[^>]*>([\\s\\S]*?)(?=<\\/div>\\s*<\\/div>|$)`, 'i');
            const match = html.match(regex);
            if (match) {
                return match[0];
            }
        }

        return null;
    }

    /**
     * Extract readable text content from HTML
     * Strips tags, scripts, styles, and normalizes whitespace
     */
    private extractTextContent(html: string): string {
        // Remove script and style elements
        let text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

        // Remove HTML comments
        text = text.replace(/<!--[\s\S]*?-->/g, '');

        // Replace common block elements with newlines
        text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n');

        // Remove all remaining HTML tags
        text = text.replace(/<[^>]+>/g, ' ');

        // Decode HTML entities
        text = this.decodeHtmlEntities(text);

        // Normalize whitespace
        text = text
            .replace(/\s+/g, ' ')
            .replace(/\n\s+/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        return text;
    }

    /**
     * Decode common HTML entities
     */
    private decodeHtmlEntities(text: string): string {
        const entities: Record<string, string> = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&apos;': "'",
            '&nbsp;': ' ',
            '&ndash;': '–',
            '&mdash;': '—',
            '&hellip;': '…',
            '&copy;': '©',
            '&reg;': '®',
            '&trade;': '™',
        };

        let result = text;
        for (const [entity, char] of Object.entries(entities)) {
            result = result.replace(new RegExp(entity, 'gi'), char);
        }

        // Handle numeric entities
        result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
        result = result.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

        return result;
    }
}

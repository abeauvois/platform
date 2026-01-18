import { BaseClient, type BaseClientConfig } from './BaseClient.js';

/**
 * Scraped data item
 */
export interface ScrapedDataItem {
    id: string;
    userId: string;
    source: string;
    sourceUrl: string;
    strategyName: string;
    data: unknown;
    itemCount: string | null;
    scrapedAt: string;
    createdAt: string;
}

/**
 * Options for saving scraped data
 */
export interface SaveScrapedDataOptions {
    source: string;
    sourceUrl: string;
    strategyName: string;
    data: unknown;
    itemCount?: number;
}

/**
 * Options for listing scraped data
 */
export interface ListScrapedDataOptions {
    source?: string;
    limit?: number;
}

/**
 * Scraper client for managing scraped data
 */
export class ScraperClient extends BaseClient {
    constructor(config: BaseClientConfig) {
        super(config);
    }

    /**
     * Save scraped data to the database
     *
     * @param options - The scraped data to save
     * @returns The ID of the saved data
     *
     * @example
     * ```typescript
     * const { id } = await client.scraper.save({
     *     source: 'leboncoin',
     *     sourceUrl: 'https://www.leboncoin.fr/recherche?category=71',
     *     strategyName: 'listings',
     *     data: scrapedListings,
     *     itemCount: scrapedListings.length
     * });
     * ```
     */
    async save(options: SaveScrapedDataOptions): Promise<{ success: boolean; id: string }> {
        return this.authenticatedRequest<{ success: boolean; id: string }>(
            '/api/scraper/data',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(options),
            }
        );
    }

    /**
     * List scraped data
     *
     * @param options - Options for filtering the list
     * @returns Array of scraped data items
     *
     * @example
     * ```typescript
     * const items = await client.scraper.list({ source: 'leboncoin', limit: 10 });
     * ```
     */
    async list(options: ListScrapedDataOptions = {}): Promise<Array<ScrapedDataItem>> {
        const params = new URLSearchParams();

        if (options.source) {
            params.set('source', options.source);
        }

        if (options.limit !== undefined) {
            params.set('limit', options.limit.toString());
        }

        const queryString = params.toString();
        const endpoint = `/api/scraper/data${queryString ? `?${queryString}` : ''}`;

        const response = await this.authenticatedRequest<{ items: Array<ScrapedDataItem> }>(
            endpoint,
            { method: 'GET' }
        );

        return response.items;
    }

    /**
     * Get a specific scraped data item by ID
     *
     * @param id - The ID of the scraped data item
     * @returns The scraped data item
     */
    async get(id: string): Promise<ScrapedDataItem> {
        return this.authenticatedRequest<ScrapedDataItem>(
            `/api/scraper/data/${id}`,
            { method: 'GET' }
        );
    }
}

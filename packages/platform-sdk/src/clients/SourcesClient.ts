import { BaseClient, type BaseClientConfig } from './BaseClient.js';

/**
 * Options for reading Gmail messages
 */
export interface GmailReadOptions {
    /** Filter by sender email address */
    email?: string;
    /** Limit to emails from the last N days */
    limitDays?: number;
    /** Only include emails containing URLs */
    withUrl?: boolean;
}

/**
 * Serialized content item from source reader
 */
export interface SourceContentItem {
    url: string;
    sourceAdapter: string;
    tags: string[];
    summary: string;
    rawContent: string;
    createdAt: string;
    updatedAt: string;
    contentType: string;
}

/**
 * Sources client for directly reading from data sources
 * without triggering workflow tasks
 */
export class SourcesClient extends BaseClient {
    constructor(config: BaseClientConfig) {
        super(config);
    }

    /**
     * Read Gmail messages directly without triggering a workflow task
     *
     * @param options - Options for filtering Gmail messages
     * @returns Array of content items from Gmail
     *
     * @example
     * ```typescript
     * const items = await client.sources.readGmail({
     *     email: 'sender@example.com',
     *     limitDays: 7,
     *     withUrl: true
     * });
     * ```
     */
    async readGmail(options: GmailReadOptions): Promise<SourceContentItem[]> {
        const params = new URLSearchParams();

        if (options.email) {
            params.set('email', options.email);
        }

        if (options.limitDays !== undefined) {
            params.set('limitDays', options.limitDays.toString());
        }

        if (options.withUrl) {
            params.set('withUrl', 'true');
        }

        const queryString = params.toString();
        const endpoint = `/api/sources/gmail/read${queryString ? `?${queryString}` : ''}`;

        const response = await this.authenticatedRequest<{ items: SourceContentItem[] }>(
            endpoint,
            { method: 'GET' }
        );

        return response.items;
    }
}

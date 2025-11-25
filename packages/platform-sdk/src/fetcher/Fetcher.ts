import type { IFetcher } from '../ports/IFetcher.js';
import type { ILogger } from '../ports/ILogger.js';
import type { AuthCredentials } from '../ports/IAuth.js';
import type { Bookmark } from '@platform/domain';

interface FetcherConfig {
    baseUrl: string;
    credentials: AuthCredentials;
    logger: ILogger;
}

/**
 * Bookmark fetcher adapter
 * Fetches bookmarks from the platform API
 */
export class Fetcher implements IFetcher {
    private baseUrl: string;
    private credentials: AuthCredentials;
    private logger: ILogger;

    constructor(config: FetcherConfig) {
        this.baseUrl = config.baseUrl;
        this.credentials = config.credentials;
        this.logger = config.logger;
    }

    /**
     * Fetch all bookmarks for authenticated user
     */
    async fetchBookmarks(): Promise<Bookmark[]> {
        try {
            this.logger.info('Fetching bookmarks...');

            const response = await fetch(`${this.baseUrl}/api/bookmarks`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `better-auth.session_token=${this.credentials.sessionToken}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Authentication failed. Please login again.');
                }
                throw new Error(`Failed to fetch bookmarks: ${response.statusText}`);
            }

            const bookmarks = await response.json() as Bookmark[];

            this.logger.success(`Fetched ${bookmarks.length} bookmarks`);
            return bookmarks;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching bookmarks: ${errorMessage}`);
            throw error;
        }
    }
}

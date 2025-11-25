import type { Bookmark } from '@platform/domain';

/**
 * Domain port: Bookmark fetcher interface
 * Defines contract for fetching bookmarks from API
 */
export interface IFetcher {
    /**
     * Fetch all bookmarks for authenticated user
     * @returns Array of bookmarks
     */
    fetchBookmarks(): Promise<Bookmark[]>;
}

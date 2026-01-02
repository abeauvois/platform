import { BaseClient } from './BaseClient.js';
import type { BaseClientConfig } from './BaseClient.js';
import type { BookmarkData } from '../types.js';

/**
 * Bookmark type for API responses
 */
export interface Bookmark {
    url: string;
    sourceAdapter: string;
    tags: Array<string>;
    summary?: string;
    rawContent?: string;
    createdAt?: Date;
    updatedAt?: Date;
    contentType?: string;
    userId?: string;
    id?: string;
}

/**
 * Bookmark client for CRUD operations on bookmarks
 */
export class BookmarkClient extends BaseClient {
    constructor(config: BaseClientConfig) {
        super(config);
    }

    /**
     * Fetch all bookmarks for authenticated user
     * Requires sessionToken to be set
     */
    async fetchAll(): Promise<Array<Bookmark>> {
        try {
            this.logger.info('Fetching bookmarks...');

            const bookmarks = await this.authenticatedRequest<Array<Bookmark>>('/api/bookmarks', {
                method: 'GET',
            });

            this.logger.info(`Fetched ${bookmarks.length} bookmarks`);
            return bookmarks;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching bookmarks: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Create a new bookmark
     * Requires sessionToken to be set
     */
    async create(data: BookmarkData): Promise<Bookmark> {
        try {
            this.logger.info('Creating bookmark...');

            const bookmark = await this.authenticatedRequest<Bookmark>('/api/bookmarks', {
                method: 'POST',
                body: JSON.stringify(data),
            });

            this.logger.info('Bookmark created successfully');
            return bookmark;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error creating bookmark: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Update an existing bookmark
     * Requires sessionToken to be set
     */
    async update(id: string, data: Partial<BookmarkData>): Promise<Bookmark> {
        try {
            this.logger.info(`Updating bookmark ${id}...`);

            const bookmark = await this.authenticatedRequest<Bookmark>(`/api/bookmarks/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });

            this.logger.info('Bookmark updated successfully');
            return bookmark;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error updating bookmark: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Delete a bookmark
     * Requires sessionToken to be set
     */
    async delete(id: string): Promise<void> {
        try {
            this.logger.info(`Deleting bookmark ${id}...`);

            await this.authenticatedRequest<void>(`/api/bookmarks/${id}`, {
                method: 'DELETE',
            });

            this.logger.info('Bookmark deleted successfully');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error deleting bookmark: ${errorMessage}`);
            throw error;
        }
    }
}

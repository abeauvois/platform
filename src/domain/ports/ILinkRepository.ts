import { Bookmark } from '../entities/Bookmark.js';

/**
 * Repository Port: Abstract storage interface for Bookmark entities
 * Enables duplicate detection and persistence across multiple storage backends
 */
export interface ILinkRepository {
    /**
     * Check if a link with the given URL already exists
     * @param url The URL to check
     * @returns true if the link exists, false otherwise
     */
    exists(url: string): Promise<boolean>;

    /**
     * Find a link by its URL
     * @param url The URL to search for
     * @returns The Bookmark if found, null otherwise
     */
    findByUrl(url: string): Promise<Bookmark | null>;

    /**
     * Save a single link
     * @param link The Bookmark to save
     */
    save(link: Bookmark): Promise<void>;

    /**
     * Save multiple links at once
     * @param links Array of Bookmarks to save
     */
    saveMany(links: Bookmark[]): Promise<void>;

    /**
     * Retrieve all stored links
     * @returns Array of all Bookmarks
     */
    findAll(): Promise<Bookmark[]>;

    /**
     * Retrieve bookmarks for a specific user
     * @param userId The user ID to filter by
     * @returns Array of Bookmarks belonging to the user
     */
    findByUserId(userId: string): Promise<Bookmark[]>;

    /**
     * Clear all stored links (useful for testing)
     */
    clear(): Promise<void>;
}

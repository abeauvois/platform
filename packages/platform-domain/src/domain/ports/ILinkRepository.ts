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
     * @returns The saved Bookmark with generated ID
     */
    save(link: Bookmark): Promise<Bookmark>;

    /**
     * Save multiple links at once
     * @param links Array of Bookmarks to save
     * @returns Array of saved Bookmarks with generated IDs
     */
    saveMany(links: Array<Bookmark>): Promise<Array<Bookmark>>;

    /**
     * Find a bookmark by its ID
     * @param id The ID to search for
     * @returns The Bookmark if found, null otherwise
     */
    findById(id: string): Promise<Bookmark | null>;

    /**
     * Update a bookmark
     * @param id The ID of the bookmark to update
     * @param userId The user ID to verify ownership
     * @param updates Partial bookmark data to update
     * @returns The updated Bookmark if found and owned by user, null otherwise
     */
    update(id: string, userId: string, updates: Partial<Bookmark>): Promise<Bookmark | null>;

    /**
     * Delete a bookmark
     * @param id The ID of the bookmark to delete
     * @param userId The user ID to verify ownership
     * @returns true if deleted, false if not found or not owned by user
     */
    delete(id: string, userId: string): Promise<boolean>;

    /**
     * Retrieve all stored links
     * @returns Array of all Bookmarks
     */
    findAll(): Promise<Array<Bookmark>>;

    /**
     * Retrieve bookmarks for a specific user
     * @param userId The user ID to filter by
     * @returns Array of Bookmarks belonging to the user
     */
    findByUserId(userId: string): Promise<Array<Bookmark>>;

    /**
     * Clear all stored links (useful for testing)
     */
    clear(): Promise<void>;

    /**
     * Check which URLs already exist for a user
     * Used for pre-filtering before batch insert to avoid duplicates
     * @param userId The user ID to check
     * @param urls Array of URLs to check
     * @returns Set of URLs that already exist
     */
    existsByUrls(userId: string, urls: Array<string>): Promise<Set<string>>;
}

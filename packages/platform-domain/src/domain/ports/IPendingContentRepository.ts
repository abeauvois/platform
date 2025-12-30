import { PendingContent, PendingContentStatus } from '../entities/PendingContent.js';

/**
 * Repository Port: Abstract storage interface for PendingContent entities
 * Manages content awaiting enrichment processing
 */
export interface IPendingContentRepository {
    /**
     * Save a single pending content item
     * @param content The PendingContent to save
     * @returns The saved PendingContent with generated ID
     */
    save(content: PendingContent): Promise<PendingContent>;

    /**
     * Save multiple pending content items at once
     * @param contents Array of PendingContent to save
     * @returns Array of saved PendingContent with generated IDs
     */
    saveMany(contents: PendingContent[]): Promise<PendingContent[]>;

    /**
     * Find pending content items for a specific user
     * @param userId The user ID to filter by
     * @returns Array of pending PendingContent items
     */
    findPendingByUserId(userId: string): Promise<PendingContent[]>;

    /**
     * Find all pending content items across all users
     * Used by scheduled enrichment task
     * @returns Array of all pending PendingContent items
     */
    findAllPending(): Promise<PendingContent[]>;

    /**
     * Update the status of a pending content item
     * @param id The ID of the item to update
     * @param status The new status
     */
    updateStatus(id: string, status: PendingContentStatus): Promise<void>;

    /**
     * Check if content with the given external ID already exists
     * Used for deduplication (e.g., same Gmail message)
     * @param userId The user ID
     * @param sourceAdapter The source adapter type
     * @param externalId The external ID to check
     * @returns true if exists, false otherwise
     */
    existsByExternalId(userId: string, sourceAdapter: string, externalId: string): Promise<boolean>;

    /**
     * Find a pending content item by its ID
     * @param id The ID to search for
     * @returns The PendingContent if found, null otherwise
     */
    findById(id: string): Promise<PendingContent | null>;
}

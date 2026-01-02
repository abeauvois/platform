import type { Bookmark } from '../../domain/entities/Bookmark.js';
import type { ILinkRepository } from '../../domain/ports/ILinkRepository.js';

/**
 * Application Service: Get bookmarks for a specific user
 * Orchestrates the retrieval of user-specific bookmarks from the repository
 */
export class GetBookmarksByUserIdService {
    constructor(private readonly repository: ILinkRepository) { }

    /**
     * Execute the use case to get bookmarks for a user
     * @param userId - The ID of the user whose bookmarks to retrieve
     * @returns Promise resolving to array of user's bookmarks
     */
    async execute(userId: string): Promise<Array<Bookmark>> {
        return await this.repository.findByUserId(userId);
    }
}

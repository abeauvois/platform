/**
 * Application Service: Get bookmarks for a specific user
 * Orchestrates the retrieval of user-specific bookmarks from the repository
 */
export class GetBookmarksByUserIdService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    /**
     * Execute the use case to get bookmarks for a user
     * @param userId - The ID of the user whose bookmarks to retrieve
     * @returns Promise resolving to array of user's bookmarks
     */
    async execute(userId) {
        return await this.repository.findByUserId(userId);
    }
}

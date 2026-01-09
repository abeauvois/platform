/**
 * Watchlist Repository Port
 * Interface for persisting and retrieving user watchlist items
 */

/**
 * Watchlist item domain entity
 */
export interface WatchlistItem {
    id: string;
    userId: string;
    symbol: string;
    createdAt: Date;
}

/**
 * Data for creating a watchlist item
 */
export interface WatchlistItemCreate {
    id: string;
    userId: string;
    symbol: string;
}

/**
 * Watchlist Repository Port
 * Interface for persisting and retrieving user watchlist items
 */
export interface IWatchlistRepository {
    /**
     * Add a symbol to user's watchlist
     * @param data - Watchlist item data
     * @returns Created watchlist item
     * @throws if symbol already exists for user
     */
    add(data: WatchlistItemCreate): Promise<WatchlistItem>;

    /**
     * Remove a symbol from user's watchlist
     * @param userId - User ID
     * @param symbol - Trading pair symbol
     * @returns true if removed, false if not found
     */
    remove(userId: string, symbol: string): Promise<boolean>;

    /**
     * Get all symbols in user's watchlist
     * @param userId - User ID
     * @returns Array of watchlist items
     */
    findByUserId(userId: string): Promise<Array<WatchlistItem>>;

    /**
     * Check if a symbol exists in user's watchlist
     * @param userId - User ID
     * @param symbol - Trading pair symbol
     * @returns true if exists, false otherwise
     */
    exists(userId: string, symbol: string): Promise<boolean>;
}

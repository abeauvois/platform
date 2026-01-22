/**
 * User Settings Repository Port
 * Interface for persisting and retrieving user trading settings
 */

/**
 * Account mode for trading
 */
export type AccountMode = 'spot' | 'margin';

/**
 * User trading settings domain entity
 */
export interface UserTradingSettings {
    userId: string;
    defaultAccountMode: AccountMode;
    /** Global reference timestamp for watchlist price variation (Unix ms) */
    globalReferenceTimestamp: number | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Data for updating user trading settings
 */
export interface UserTradingSettingsUpdate {
    defaultAccountMode?: AccountMode;
    /** Global reference timestamp for watchlist price variation (Unix ms), or null to clear */
    globalReferenceTimestamp?: number | null;
}

/**
 * User Settings Repository Port
 * Interface for persisting and retrieving user trading settings
 */
export interface IUserSettingsRepository {
    /**
     * Get user trading settings
     * @param userId - User ID
     * @returns Settings if exists, null otherwise
     */
    findByUserId(userId: string): Promise<UserTradingSettings | null>;

    /**
     * Create or update user trading settings (upsert)
     * @param userId - User ID
     * @param data - Settings to update
     * @returns Updated settings
     */
    upsert(userId: string, data: UserTradingSettingsUpdate): Promise<UserTradingSettings>;
}

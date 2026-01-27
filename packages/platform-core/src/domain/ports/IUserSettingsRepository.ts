/**
 * User Settings types and repository port
 */

export type Theme = 'light' | 'dark' | 'system';

/**
 * User settings domain entity
 */
export interface UserSettings {
    userId: string;
    theme: Theme;
    locale: string;
    preferences: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Data for updating user settings (all fields optional)
 */
export interface UserSettingsUpdate {
    theme?: Theme;
    locale?: string;
    preferences?: Record<string, unknown>;
}

/**
 * Repository port for user settings persistence
 */
export interface IUserSettingsRepository {
    /**
     * Find settings by user ID
     * @param userId - The user's ID
     * @returns The user settings or null if not found
     */
    findByUserId(userId: string): Promise<UserSettings | null>;

    /**
     * Create or update user settings
     * @param userId - The user's ID
     * @param data - Partial settings to upsert
     * @returns The upserted settings
     */
    upsert(userId: string, data: UserSettingsUpdate): Promise<UserSettings>;
}

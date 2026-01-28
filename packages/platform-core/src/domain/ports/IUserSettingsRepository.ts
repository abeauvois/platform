/**
 * User Settings Repository Port
 * Supports multi-level settings with namespaced preferences
 */

import type {
    PlatformSettings,
    SettingsNamespace,
    UserSettings,
    UserSettingsUpdate,
} from '../entities/Settings';

// Re-export types for convenience
export type { Theme, SettingsNamespace, PlatformSettings, UserSettings, UserSettingsUpdate } from '../entities/Settings';
export * from '../entities/Settings';

/**
 * Repository port for user settings persistence
 */
export interface IUserSettingsRepository {
    /**
     * Find full settings by user ID
     * @param userId - The user's ID
     * @returns The complete user settings or null if not found
     */
    findByUserId(userId: string): Promise<UserSettings | null>;

    /**
     * Create or update user settings (full update)
     * @param userId - The user's ID
     * @param data - Partial settings to upsert
     * @returns The upserted settings
     */
    upsert(userId: string, data: UserSettingsUpdate): Promise<UserSettings>;

    /**
     * Get a single namespace's settings
     * @param userId - The user's ID
     * @param namespace - The namespace to retrieve (e.g., 'app:dashboard')
     * @returns The namespace settings or empty object if not found
     */
    getNamespace(userId: string, namespace: SettingsNamespace): Promise<Record<string, unknown>>;

    /**
     * Update platform settings (theme, locale)
     * @param userId - The user's ID
     * @param data - Platform settings to update
     * @returns The updated full settings
     */
    updatePlatform(userId: string, data: Partial<PlatformSettings>): Promise<UserSettings>;

    /**
     * Update a specific namespace's settings (deep merge)
     * @param userId - The user's ID
     * @param namespace - The namespace to update (e.g., 'app:dashboard')
     * @param data - Settings to merge into the namespace
     * @returns The updated full settings
     */
    updateNamespace(
        userId: string,
        namespace: SettingsNamespace,
        data: Record<string, unknown>
    ): Promise<UserSettings>;

    /**
     * Reset a namespace to empty (remove all settings for that namespace)
     * @param userId - The user's ID
     * @param namespace - The namespace to reset
     * @returns The updated full settings
     */
    resetNamespace(userId: string, namespace: SettingsNamespace): Promise<UserSettings>;
}

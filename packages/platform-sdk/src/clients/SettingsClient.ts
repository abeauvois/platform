import { BaseClient } from './BaseClient.js';
import type { BaseClientConfig } from './BaseClient.js';

export type Theme = 'light' | 'dark' | 'system';

/**
 * User settings type for API responses
 */
export interface UserSettings {
    userId: string;
    theme: Theme;
    locale: string;
    preferences: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
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
 * Settings client for user preferences
 */
export class SettingsClient extends BaseClient {
    constructor(config: BaseClientConfig) {
        super(config);
    }

    /**
     * Fetch user settings for authenticated user
     * Requires authentication
     */
    async getUserSettings(): Promise<UserSettings> {
        try {
            this.logger.info('Fetching user settings...');

            const settings = await this.authenticatedRequest<UserSettings>('/api/settings', {
                method: 'GET',
            });

            this.logger.info('User settings fetched successfully');
            return settings;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching user settings: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Update user settings (partial updates supported)
     * Requires authentication
     */
    async updateUserSettings(data: UserSettingsUpdate): Promise<UserSettings> {
        try {
            this.logger.info('Updating user settings...');

            const settings = await this.authenticatedRequest<UserSettings>('/api/settings', {
                method: 'PUT',
                body: JSON.stringify(data),
            });

            this.logger.info('User settings updated successfully');
            return settings;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error updating user settings: ${errorMessage}`);
            throw error;
        }
    }
}

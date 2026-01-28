import { BaseClient } from './BaseClient.js';
import type { BaseClientConfig } from './BaseClient.js';

// ============================================================================
// Core Types
// ============================================================================

export type Theme = 'light' | 'dark' | 'system';

/**
 * Namespace convention: `{scope}:{name}` where scope is app, domain, or feature.
 */
export type SettingsNamespace = `app:${string}` | `domain:${string}` | `feature:${string}`;

/**
 * Platform settings (theme, locale)
 */
export interface PlatformSettings {
    theme: Theme;
    locale: string;
}

/**
 * Full user settings from API
 */
export interface UserSettings {
    userId: string;
    platform: PlatformSettings;
    preferences: Record<SettingsNamespace, Record<string, unknown>>;
    createdAt: string;
    updatedAt: string;
}

/**
 * Data for updating user settings
 */
export interface UserSettingsUpdate {
    platform?: Partial<PlatformSettings>;
    preferences?: Record<SettingsNamespace, Record<string, unknown>>;
}

// ============================================================================
// Type-Safe Namespace Settings
// ============================================================================

/**
 * Dashboard app settings
 * Namespace: 'app:dashboard'
 */
export interface DashboardAppSettings {
    sidebarCollapsed?: boolean;
    defaultView?: 'grid' | 'list' | 'kanban';
    itemsPerPage?: number;
}

/**
 * CLI app settings
 * Namespace: 'app:cli'
 */
export interface CliAppSettings {
    outputFormat?: 'json' | 'table' | 'minimal';
    colorEnabled?: boolean;
}

/**
 * Trading domain settings
 * Namespace: 'domain:trading'
 */
export interface TradingDomainSettings {
    defaultExchange?: 'binance' | 'coinbase' | 'kraken';
    riskLevel?: 'conservative' | 'moderate' | 'aggressive';
    confirmBeforeTrade?: boolean;
}

/**
 * Bookmarks domain settings
 * Namespace: 'domain:bookmarks'
 */
export interface BookmarksDomainSettings {
    autoEnrich?: boolean;
    archiveAfterDays?: number;
}

/**
 * Maps namespace strings to their typed settings interfaces.
 */
export interface NamespaceSettingsMap {
    'app:dashboard': DashboardAppSettings;
    'app:cli': CliAppSettings;
    'domain:trading': TradingDomainSettings;
    'domain:bookmarks': BookmarksDomainSettings;
}

export type KnownNamespace = keyof NamespaceSettingsMap;

// ============================================================================
// Settings Client
// ============================================================================

/**
 * Settings client for user preferences with namespace support
 */
export class SettingsClient extends BaseClient {
    constructor(config: BaseClientConfig) {
        super(config);
    }

    // ========================================================================
    // Full Settings
    // ========================================================================

    /**
     * Fetch full user settings
     * Requires authentication
     */
    async getAll(): Promise<UserSettings> {
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
     * Update user settings (platform and/or namespaces)
     * Requires authentication
     */
    async update(data: UserSettingsUpdate): Promise<UserSettings> {
        try {
            this.logger.info('Updating user settings...');

            const settings = await this.authenticatedRequest<UserSettings>('/api/settings', {
                method: 'PATCH',
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

    // ========================================================================
    // Platform Settings
    // ========================================================================

    /**
     * Fetch platform settings only (theme, locale)
     * Requires authentication
     */
    async getPlatform(): Promise<PlatformSettings> {
        try {
            this.logger.info('Fetching platform settings...');

            const platform = await this.authenticatedRequest<PlatformSettings>('/api/settings/platform', {
                method: 'GET',
            });

            this.logger.info('Platform settings fetched successfully');
            return platform;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching platform settings: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Update platform settings (theme, locale)
     * Requires authentication
     */
    async updatePlatform(data: Partial<PlatformSettings>): Promise<PlatformSettings> {
        try {
            this.logger.info('Updating platform settings...');

            const platform = await this.authenticatedRequest<PlatformSettings>('/api/settings/platform', {
                method: 'PATCH',
                body: JSON.stringify(data),
            });

            this.logger.info('Platform settings updated successfully');
            return platform;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error updating platform settings: ${errorMessage}`);
            throw error;
        }
    }

    // ========================================================================
    // Namespace Settings (Type-Safe Overloads)
    // ========================================================================

    /**
     * Get namespace settings - type-safe for known namespaces
     */
    async getNamespace(namespace: 'app:dashboard'): Promise<DashboardAppSettings>;
    async getNamespace(namespace: 'app:cli'): Promise<CliAppSettings>;
    async getNamespace(namespace: 'domain:trading'): Promise<TradingDomainSettings>;
    async getNamespace(namespace: 'domain:bookmarks'): Promise<BookmarksDomainSettings>;
    async getNamespace(namespace: SettingsNamespace): Promise<Record<string, unknown>>;
    async getNamespace(namespace: SettingsNamespace): Promise<Record<string, unknown>> {
        try {
            this.logger.info(`Fetching namespace settings for ${namespace}...`);

            const data = await this.authenticatedRequest<Record<string, unknown>>(
                `/api/settings/namespace/${encodeURIComponent(namespace)}`,
                { method: 'GET' }
            );

            this.logger.info(`Namespace ${namespace} fetched successfully`);
            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching namespace ${namespace}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Update namespace settings - type-safe for known namespaces
     */
    async updateNamespace(namespace: 'app:dashboard', data: DashboardAppSettings): Promise<DashboardAppSettings>;
    async updateNamespace(namespace: 'app:cli', data: CliAppSettings): Promise<CliAppSettings>;
    async updateNamespace(namespace: 'domain:trading', data: TradingDomainSettings): Promise<TradingDomainSettings>;
    async updateNamespace(namespace: 'domain:bookmarks', data: BookmarksDomainSettings): Promise<BookmarksDomainSettings>;
    async updateNamespace(namespace: SettingsNamespace, data: Record<string, unknown>): Promise<Record<string, unknown>>;
    async updateNamespace(namespace: SettingsNamespace, data: Record<string, unknown>): Promise<Record<string, unknown>> {
        try {
            this.logger.info(`Updating namespace settings for ${namespace}...`);

            const updated = await this.authenticatedRequest<Record<string, unknown>>(
                `/api/settings/namespace/${encodeURIComponent(namespace)}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify(data),
                }
            );

            this.logger.info(`Namespace ${namespace} updated successfully`);
            return updated;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error updating namespace ${namespace}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Reset namespace to empty (remove all settings for that namespace)
     * Requires authentication
     */
    async resetNamespace(namespace: SettingsNamespace): Promise<void> {
        try {
            this.logger.info(`Resetting namespace ${namespace}...`);

            await this.authenticatedRequest<{ success: boolean }>(
                `/api/settings/namespace/${encodeURIComponent(namespace)}`,
                { method: 'DELETE' }
            );

            this.logger.info(`Namespace ${namespace} reset successfully`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error resetting namespace ${namespace}: ${errorMessage}`);
            throw error;
        }
    }

    // ========================================================================
    // Legacy Methods (backwards compatibility)
    // ========================================================================

    /**
     * @deprecated Use getAll() instead
     */
    async getUserSettings(): Promise<UserSettings> {
        return this.getAll();
    }

    /**
     * @deprecated Use update() instead
     */
    async updateUserSettings(data: UserSettingsUpdate): Promise<UserSettings> {
        return this.update(data);
    }
}

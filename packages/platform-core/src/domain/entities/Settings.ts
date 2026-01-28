/**
 * Settings domain entities
 * Multi-level settings architecture with namespaced preferences
 */

// ============================================================================
// Core Types
// ============================================================================

export type Theme = 'light' | 'dark' | 'system';

/**
 * Namespace convention: `{scope}:{name}` where scope is app, domain, or feature.
 * Examples: 'app:dashboard', 'domain:trading', 'feature:onboarding'
 */
export type SettingsNamespace = `app:${string}` | `domain:${string}` | `feature:${string}`;

// ============================================================================
// Platform Settings (typed columns in DB)
// ============================================================================

export interface PlatformSettings {
    theme: Theme;
    locale: string;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
    theme: 'system',
    locale: 'en',
};

// ============================================================================
// User Settings (full domain entity)
// ============================================================================

export interface UserSettings {
    userId: string;
    platform: PlatformSettings;
    preferences: Record<SettingsNamespace, Record<string, unknown>>;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserSettingsUpdate {
    platform?: Partial<PlatformSettings>;
    preferences?: Record<SettingsNamespace, Record<string, unknown>>;
}

// ============================================================================
// Type-Safe Namespace Settings (for SDK type overloads)
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
 * Gamification app settings
 * Namespace: 'app:gamification'
 */
export interface GamificationAppSettings {
    showAchievements?: boolean;
    soundEffects?: boolean;
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

// ============================================================================
// Namespace Mapping Type (for SDK type inference)
// ============================================================================

/**
 * Maps namespace strings to their typed settings interfaces.
 * Used by SDK for type-safe getNamespace/updateNamespace overloads.
 */
export interface NamespaceSettingsMap {
    'app:dashboard': DashboardAppSettings;
    'app:cli': CliAppSettings;
    'app:gamification': GamificationAppSettings;
    'domain:trading': TradingDomainSettings;
    'domain:bookmarks': BookmarksDomainSettings;
}

/**
 * Known namespaces with typed settings
 */
export type KnownNamespace = keyof NamespaceSettingsMap;

/**
 * Utility type to get settings type for a namespace
 */
export type NamespaceSettings<N extends SettingsNamespace> =
    N extends KnownNamespace ? NamespaceSettingsMap[N] : Record<string, unknown>;

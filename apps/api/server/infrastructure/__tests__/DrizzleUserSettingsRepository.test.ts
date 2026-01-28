/**
 * Unit Tests: DrizzleUserSettingsRepository
 * Tests the user settings repository implementation with namespace support
 *
 * Note: These tests use an in-memory mock to avoid database dependency.
 * Integration tests with real database should be in a separate file.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type {
    IUserSettingsRepository,
    UserSettings,
    UserSettingsUpdate,
    PlatformSettings,
    SettingsNamespace,
} from '@abeauvois/platform-core';

/**
 * In-memory implementation for unit testing
 * Mirrors DrizzleUserSettingsRepository behavior
 */
class InMemoryUserSettingsRepository implements IUserSettingsRepository {
    private storage = new Map<string, {
        userId: string;
        theme: string;
        locale: string;
        preferences: Record<string, Record<string, unknown>>;
        createdAt: Date;
        updatedAt: Date;
    }>();

    async findByUserId(userId: string): Promise<UserSettings | null> {
        const row = this.storage.get(userId);
        if (!row) return null;
        return this.toDomain(row);
    }

    async upsert(userId: string, data: UserSettingsUpdate): Promise<UserSettings> {
        const existing = this.storage.get(userId);
        const now = new Date();

        if (existing) {
            // Update existing
            const updated = {
                ...existing,
                ...(data.platform?.theme !== undefined && { theme: data.platform.theme }),
                ...(data.platform?.locale !== undefined && { locale: data.platform.locale }),
                ...(data.preferences !== undefined && {
                    preferences: { ...existing.preferences, ...data.preferences },
                }),
                updatedAt: now,
            };
            this.storage.set(userId, updated);
            return this.toDomain(updated);
        }

        // Create new
        const created = {
            userId,
            theme: data.platform?.theme ?? 'system',
            locale: data.platform?.locale ?? 'en',
            preferences: data.preferences ?? {},
            createdAt: now,
            updatedAt: now,
        };
        this.storage.set(userId, created);
        return this.toDomain(created);
    }

    async getNamespace(userId: string, namespace: SettingsNamespace): Promise<Record<string, unknown>> {
        const row = this.storage.get(userId);
        if (!row) return {};
        return row.preferences[namespace] ?? {};
    }

    async updatePlatform(userId: string, data: Partial<PlatformSettings>): Promise<UserSettings> {
        return this.upsert(userId, { platform: data });
    }

    async updateNamespace(
        userId: string,
        namespace: SettingsNamespace,
        data: Record<string, unknown>
    ): Promise<UserSettings> {
        const existing = this.storage.get(userId);
        const now = new Date();

        if (!existing) {
            // Create new with namespace
            const created = {
                userId,
                theme: 'system',
                locale: 'en',
                preferences: { [namespace]: data },
                createdAt: now,
                updatedAt: now,
            };
            this.storage.set(userId, created);
            return this.toDomain(created);
        }

        // Deep merge the namespace
        const existingNamespaceData = existing.preferences[namespace] ?? {};
        const updated = {
            ...existing,
            preferences: {
                ...existing.preferences,
                [namespace]: { ...existingNamespaceData, ...data },
            },
            updatedAt: now,
        };
        this.storage.set(userId, updated);
        return this.toDomain(updated);
    }

    async resetNamespace(userId: string, namespace: SettingsNamespace): Promise<UserSettings> {
        const existing = this.storage.get(userId);
        const now = new Date();

        if (!existing) {
            // Create default settings without the namespace
            const created = {
                userId,
                theme: 'system',
                locale: 'en',
                preferences: {},
                createdAt: now,
                updatedAt: now,
            };
            this.storage.set(userId, created);
            return this.toDomain(created);
        }

        // Remove the namespace from preferences
        const { [namespace]: _removed, ...remainingPreferences } = existing.preferences;
        const updated = {
            ...existing,
            preferences: remainingPreferences,
            updatedAt: now,
        };
        this.storage.set(userId, updated);
        return this.toDomain(updated);
    }

    private toDomain(row: {
        userId: string;
        theme: string;
        locale: string;
        preferences: Record<string, Record<string, unknown>>;
        createdAt: Date;
        updatedAt: Date;
    }): UserSettings {
        return {
            userId: row.userId,
            platform: {
                theme: row.theme as 'light' | 'dark' | 'system',
                locale: row.locale,
            },
            preferences: row.preferences as Record<SettingsNamespace, Record<string, unknown>>,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    // Test helper
    clear(): void {
        this.storage.clear();
    }
}

describe('UserSettingsRepository', () => {
    let repository: InMemoryUserSettingsRepository;
    const testUserId = 'user-123';

    beforeEach(() => {
        repository = new InMemoryUserSettingsRepository();
    });

    describe('findByUserId', () => {
        test('should return null for non-existing user', async () => {
            const result = await repository.findByUserId('nonexistent');
            expect(result).toBeNull();
        });

        test('should return settings for existing user', async () => {
            await repository.upsert(testUserId, {});

            const result = await repository.findByUserId(testUserId);

            expect(result).not.toBeNull();
            expect(result?.userId).toBe(testUserId);
            expect(result?.platform.theme).toBe('system');
            expect(result?.platform.locale).toBe('en');
            expect(result?.preferences).toEqual({});
        });
    });

    describe('upsert', () => {
        test('should create settings with defaults for new user', async () => {
            const result = await repository.upsert(testUserId, {});

            expect(result.userId).toBe(testUserId);
            expect(result.platform.theme).toBe('system');
            expect(result.platform.locale).toBe('en');
            expect(result.preferences).toEqual({});
            expect(result.createdAt).toBeInstanceOf(Date);
            expect(result.updatedAt).toBeInstanceOf(Date);
        });

        test('should create settings with provided platform values', async () => {
            const result = await repository.upsert(testUserId, {
                platform: { theme: 'dark', locale: 'fr' },
            });

            expect(result.platform.theme).toBe('dark');
            expect(result.platform.locale).toBe('fr');
        });

        test('should create settings with preferences', async () => {
            const result = await repository.upsert(testUserId, {
                preferences: {
                    'app:dashboard': { sidebarCollapsed: true },
                },
            });

            expect(result.preferences['app:dashboard']).toEqual({ sidebarCollapsed: true });
        });

        test('should update existing settings partially', async () => {
            await repository.upsert(testUserId, {
                platform: { theme: 'light', locale: 'en' },
            });

            const result = await repository.upsert(testUserId, {
                platform: { theme: 'dark' },
            });

            expect(result.platform.theme).toBe('dark');
            expect(result.platform.locale).toBe('en'); // unchanged
        });

        test('should merge preferences on update', async () => {
            await repository.upsert(testUserId, {
                preferences: {
                    'app:dashboard': { sidebarCollapsed: true },
                },
            });

            const result = await repository.upsert(testUserId, {
                preferences: {
                    'domain:trading': { riskLevel: 'moderate' },
                },
            });

            expect(result.preferences['app:dashboard']).toEqual({ sidebarCollapsed: true });
            expect(result.preferences['domain:trading']).toEqual({ riskLevel: 'moderate' });
        });
    });

    describe('getNamespace', () => {
        test('should return empty object for non-existing user', async () => {
            const result = await repository.getNamespace('nonexistent', 'app:dashboard');
            expect(result).toEqual({});
        });

        test('should return empty object for non-existing namespace', async () => {
            await repository.upsert(testUserId, {});

            const result = await repository.getNamespace(testUserId, 'app:dashboard');
            expect(result).toEqual({});
        });

        test('should return namespace settings', async () => {
            await repository.upsert(testUserId, {
                preferences: {
                    'app:dashboard': { sidebarCollapsed: true, itemsPerPage: 20 },
                    'domain:trading': { riskLevel: 'moderate' },
                },
            });

            const dashboardSettings = await repository.getNamespace(testUserId, 'app:dashboard');
            expect(dashboardSettings).toEqual({ sidebarCollapsed: true, itemsPerPage: 20 });

            const tradingSettings = await repository.getNamespace(testUserId, 'domain:trading');
            expect(tradingSettings).toEqual({ riskLevel: 'moderate' });
        });
    });

    describe('updatePlatform', () => {
        test('should create settings with platform values for new user', async () => {
            const result = await repository.updatePlatform(testUserId, { theme: 'dark' });

            expect(result.platform.theme).toBe('dark');
            expect(result.platform.locale).toBe('en'); // default
        });

        test('should update only specified platform fields', async () => {
            await repository.upsert(testUserId, {
                platform: { theme: 'light', locale: 'fr' },
            });

            const result = await repository.updatePlatform(testUserId, { locale: 'de' });

            expect(result.platform.theme).toBe('light'); // unchanged
            expect(result.platform.locale).toBe('de');
        });

        test('should preserve preferences when updating platform', async () => {
            await repository.upsert(testUserId, {
                preferences: {
                    'app:dashboard': { sidebarCollapsed: true },
                },
            });

            const result = await repository.updatePlatform(testUserId, { theme: 'dark' });

            expect(result.preferences['app:dashboard']).toEqual({ sidebarCollapsed: true });
        });
    });

    describe('updateNamespace', () => {
        test('should create settings with namespace for new user', async () => {
            const result = await repository.updateNamespace(
                testUserId,
                'app:dashboard',
                { sidebarCollapsed: true }
            );

            expect(result.userId).toBe(testUserId);
            expect(result.preferences['app:dashboard']).toEqual({ sidebarCollapsed: true });
        });

        test('should merge data into existing namespace', async () => {
            await repository.upsert(testUserId, {
                preferences: {
                    'app:dashboard': { sidebarCollapsed: true, itemsPerPage: 10 },
                },
            });

            const result = await repository.updateNamespace(
                testUserId,
                'app:dashboard',
                { itemsPerPage: 20, defaultView: 'grid' }
            );

            expect(result.preferences['app:dashboard']).toEqual({
                sidebarCollapsed: true, // preserved
                itemsPerPage: 20, // updated
                defaultView: 'grid', // added
            });
        });

        test('should add new namespace without affecting others', async () => {
            await repository.upsert(testUserId, {
                preferences: {
                    'app:dashboard': { sidebarCollapsed: true },
                },
            });

            const result = await repository.updateNamespace(
                testUserId,
                'domain:trading',
                { riskLevel: 'moderate' }
            );

            expect(result.preferences['app:dashboard']).toEqual({ sidebarCollapsed: true });
            expect(result.preferences['domain:trading']).toEqual({ riskLevel: 'moderate' });
        });

        test('should preserve platform settings', async () => {
            await repository.upsert(testUserId, {
                platform: { theme: 'dark', locale: 'fr' },
            });

            const result = await repository.updateNamespace(
                testUserId,
                'app:dashboard',
                { sidebarCollapsed: true }
            );

            expect(result.platform.theme).toBe('dark');
            expect(result.platform.locale).toBe('fr');
        });
    });

    describe('resetNamespace', () => {
        test('should create default settings for new user', async () => {
            const result = await repository.resetNamespace(testUserId, 'app:dashboard');

            expect(result.userId).toBe(testUserId);
            expect(result.preferences).toEqual({});
        });

        test('should remove specified namespace', async () => {
            await repository.upsert(testUserId, {
                preferences: {
                    'app:dashboard': { sidebarCollapsed: true },
                    'domain:trading': { riskLevel: 'moderate' },
                },
            });

            const result = await repository.resetNamespace(testUserId, 'app:dashboard');

            expect(result.preferences['app:dashboard']).toBeUndefined();
            expect(result.preferences['domain:trading']).toEqual({ riskLevel: 'moderate' });
        });

        test('should preserve platform settings', async () => {
            await repository.upsert(testUserId, {
                platform: { theme: 'dark', locale: 'fr' },
                preferences: {
                    'app:dashboard': { sidebarCollapsed: true },
                },
            });

            const result = await repository.resetNamespace(testUserId, 'app:dashboard');

            expect(result.platform.theme).toBe('dark');
            expect(result.platform.locale).toBe('fr');
        });

        test('should handle non-existing namespace gracefully', async () => {
            await repository.upsert(testUserId, {
                preferences: {
                    'app:dashboard': { sidebarCollapsed: true },
                },
            });

            const result = await repository.resetNamespace(testUserId, 'domain:trading');

            // Should not throw, just return settings as-is
            expect(result.preferences['app:dashboard']).toEqual({ sidebarCollapsed: true });
            expect(result.preferences['domain:trading']).toBeUndefined();
        });
    });

    describe('namespace patterns', () => {
        test('should support app namespaces', async () => {
            await repository.updateNamespace(testUserId, 'app:dashboard', { test: true });
            await repository.updateNamespace(testUserId, 'app:cli', { colorEnabled: true });
            await repository.updateNamespace(testUserId, 'app:gamification', { soundEffects: false });

            const settings = await repository.findByUserId(testUserId);

            expect(settings?.preferences['app:dashboard']).toEqual({ test: true });
            expect(settings?.preferences['app:cli']).toEqual({ colorEnabled: true });
            expect(settings?.preferences['app:gamification']).toEqual({ soundEffects: false });
        });

        test('should support domain namespaces', async () => {
            await repository.updateNamespace(testUserId, 'domain:trading', { riskLevel: 'aggressive' });
            await repository.updateNamespace(testUserId, 'domain:bookmarks', { autoEnrich: true });

            const settings = await repository.findByUserId(testUserId);

            expect(settings?.preferences['domain:trading']).toEqual({ riskLevel: 'aggressive' });
            expect(settings?.preferences['domain:bookmarks']).toEqual({ autoEnrich: true });
        });

        test('should support feature namespaces', async () => {
            await repository.updateNamespace(testUserId, 'feature:onboarding', { completed: true });
            await repository.updateNamespace(testUserId, 'feature:beta', { enrolled: true });

            const settings = await repository.findByUserId(testUserId);

            expect(settings?.preferences['feature:onboarding']).toEqual({ completed: true });
            expect(settings?.preferences['feature:beta']).toEqual({ enrolled: true });
        });
    });

    describe('timestamps', () => {
        test('should set createdAt on creation', async () => {
            const before = new Date();
            const result = await repository.upsert(testUserId, {});
            const after = new Date();

            expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(result.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        test('should update updatedAt on modification', async () => {
            const created = await repository.upsert(testUserId, {});
            const originalUpdatedAt = created.updatedAt;

            // Wait a tiny bit to ensure different timestamp
            await new Promise((resolve) => setTimeout(resolve, 1));

            const updated = await repository.updatePlatform(testUserId, { theme: 'dark' });

            expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
            expect(updated.createdAt.getTime()).toBe(created.createdAt.getTime());
        });
    });
});

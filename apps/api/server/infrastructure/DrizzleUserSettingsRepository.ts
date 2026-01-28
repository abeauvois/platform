import { db, userSettings, eq, sql } from '@abeauvois/platform-db';
import type {
    IUserSettingsRepository,
    UserSettings,
    UserSettingsUpdate,
    PlatformSettings,
    SettingsNamespace,
    Theme,
} from '@abeauvois/platform-core';

export class DrizzleUserSettingsRepository implements IUserSettingsRepository {
    async findByUserId(userId: string): Promise<UserSettings | null> {
        const [result] = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, userId));

        return result ? this.toDomain(result) : null;
    }

    async upsert(userId: string, data: UserSettingsUpdate): Promise<UserSettings> {
        const [result] = await db
            .insert(userSettings)
            .values({
                userId,
                theme: data.platform?.theme ?? 'system',
                locale: data.platform?.locale ?? 'en',
                preferences: data.preferences ?? {},
            })
            .onConflictDoUpdate({
                target: userSettings.userId,
                set: {
                    ...(data.platform?.theme !== undefined && { theme: data.platform.theme }),
                    ...(data.platform?.locale !== undefined && { locale: data.platform.locale }),
                    ...(data.preferences !== undefined && {
                        // Merge preferences with existing using JSONB concatenation
                        preferences: sql`COALESCE(${userSettings.preferences}, '{}'::jsonb) || ${JSON.stringify(data.preferences)}::jsonb`,
                    }),
                    updatedAt: new Date(),
                },
            })
            .returning();

        return this.toDomain(result);
    }

    async getNamespace(userId: string, namespace: SettingsNamespace): Promise<Record<string, unknown>> {
        const [result] = await db
            .select({
                namespaceData: sql<Record<string, unknown>>`COALESCE(${userSettings.preferences}->${namespace}, '{}'::jsonb)`,
            })
            .from(userSettings)
            .where(eq(userSettings.userId, userId));

        if (!result) return {};

        // Handle case where result.namespaceData might be a string or object
        const data = result.namespaceData;
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch {
                return {};
            }
        }
        return data ?? {};
    }

    async updatePlatform(userId: string, data: Partial<PlatformSettings>): Promise<UserSettings> {
        const [result] = await db
            .insert(userSettings)
            .values({
                userId,
                theme: data.theme ?? 'system',
                locale: data.locale ?? 'en',
                preferences: {},
            })
            .onConflictDoUpdate({
                target: userSettings.userId,
                set: {
                    ...(data.theme !== undefined && { theme: data.theme }),
                    ...(data.locale !== undefined && { locale: data.locale }),
                    updatedAt: new Date(),
                },
            })
            .returning();

        return this.toDomain(result);
    }

    async updateNamespace(
        userId: string,
        namespace: SettingsNamespace,
        data: Record<string, unknown>
    ): Promise<UserSettings> {
        // Use jsonb_set with concatenation for deep merge
        // First check if user exists
        const existing = await this.findByUserId(userId);

        if (!existing) {
            // Create new user settings with the namespace
            const [result] = await db
                .insert(userSettings)
                .values({
                    userId,
                    theme: 'system',
                    locale: 'en',
                    preferences: { [namespace]: data },
                })
                .returning();
            return this.toDomain(result);
        }

        // Update existing: merge the namespace data
        const [result] = await db
            .update(userSettings)
            .set({
                preferences: sql`jsonb_set(
                    COALESCE(${userSettings.preferences}, '{}'::jsonb),
                    ${sql.raw(`'{${namespace}}'`)},
                    COALESCE(${userSettings.preferences}->${namespace}, '{}'::jsonb) || ${JSON.stringify(data)}::jsonb,
                    true
                )`,
                updatedAt: new Date(),
            })
            .where(eq(userSettings.userId, userId))
            .returning();

        return this.toDomain(result);
    }

    async resetNamespace(userId: string, namespace: SettingsNamespace): Promise<UserSettings> {
        const existing = await this.findByUserId(userId);

        if (!existing) {
            // Create default settings
            const [result] = await db
                .insert(userSettings)
                .values({
                    userId,
                    theme: 'system',
                    locale: 'en',
                    preferences: {},
                })
                .returning();
            return this.toDomain(result);
        }

        // Remove the namespace key from preferences
        const [result] = await db
            .update(userSettings)
            .set({
                preferences: sql`COALESCE(${userSettings.preferences}, '{}'::jsonb) - ${namespace}`,
                updatedAt: new Date(),
            })
            .where(eq(userSettings.userId, userId))
            .returning();

        return this.toDomain(result);
    }

    private toDomain(row: typeof userSettings.$inferSelect): UserSettings {
        return {
            userId: row.userId,
            platform: {
                theme: row.theme as Theme,
                locale: row.locale,
            },
            preferences: (row.preferences ?? {}) as Record<SettingsNamespace, Record<string, unknown>>,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
}

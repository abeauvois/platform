import { db, userSettings, eq } from '@abeauvois/platform-db';
import type {
    IUserSettingsRepository,
    UserSettings,
    UserSettingsUpdate,
    Theme,
} from '@abeauvois/platform-domain';

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
                theme: data.theme ?? 'system',
                locale: data.locale ?? 'en',
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

    private toDomain(row: typeof userSettings.$inferSelect): UserSettings {
        return {
            userId: row.userId,
            theme: row.theme as Theme,
            locale: row.locale,
            preferences: {},
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
}

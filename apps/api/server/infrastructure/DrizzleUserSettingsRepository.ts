import { db, userSettings, eq } from '@abeauvois/platform-db';
import type {
    IUserSettingsRepository,
    UserSettings,
    UserSettingsUpdate,
    Theme,
    AccountMode,
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
                tradingAccountMode: data.tradingAccountMode ?? 'spot',
                tradingReferenceTimestamp: data.tradingReferenceTimestamp ?? null,
            })
            .onConflictDoUpdate({
                target: userSettings.userId,
                set: {
                    ...(data.theme !== undefined && { theme: data.theme }),
                    ...(data.locale !== undefined && { locale: data.locale }),
                    ...(data.tradingAccountMode !== undefined && { tradingAccountMode: data.tradingAccountMode }),
                    ...(data.tradingReferenceTimestamp !== undefined && { tradingReferenceTimestamp: data.tradingReferenceTimestamp }),
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
            tradingAccountMode: (row.tradingAccountMode ?? 'spot') as AccountMode,
            tradingReferenceTimestamp: row.tradingReferenceTimestamp,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
}

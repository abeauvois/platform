import { db, userSettings, eq } from '@abeauvois/platform-db';
import type {
    IUserSettingsRepository,
    UserTradingSettings,
    UserTradingSettingsUpdate,
    AccountMode,
} from '@abeauvois/platform-trading-domain';

export class DrizzleUserSettingsRepository implements IUserSettingsRepository {
    async findByUserId(userId: string): Promise<UserTradingSettings | null> {
        const [result] = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, userId))
            .limit(1);

        return result ? this.toDomain(result) : null;
    }

    async upsert(userId: string, data: UserTradingSettingsUpdate): Promise<UserTradingSettings> {
        const existing = await this.findByUserId(userId);

        if (existing) {
            // Update existing settings
            // Only update globalReferenceTimestamp if explicitly provided (including null)
            const updateData: Record<string, unknown> = {
                tradingAccountMode: data.defaultAccountMode ?? existing.defaultAccountMode,
                updatedAt: new Date(),
            };
            if ('globalReferenceTimestamp' in data) {
                updateData.tradingReferenceTimestamp = data.globalReferenceTimestamp;
            }

            const [result] = await db
                .update(userSettings)
                .set(updateData)
                .where(eq(userSettings.userId, userId))
                .returning();

            return this.toDomain(result);
        } else {
            // Create new settings
            const [result] = await db
                .insert(userSettings)
                .values({
                    userId,
                    tradingAccountMode: data.defaultAccountMode ?? 'spot',
                    tradingReferenceTimestamp: data.globalReferenceTimestamp ?? null,
                })
                .returning();

            return this.toDomain(result);
        }
    }

    private toDomain(row: typeof userSettings.$inferSelect): UserTradingSettings {
        return {
            userId: row.userId,
            defaultAccountMode: (row.tradingAccountMode ?? 'spot') as AccountMode,
            globalReferenceTimestamp: row.tradingReferenceTimestamp ?? null,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
}

import { db, userTradingSettings, eq } from '@platform/db';
import type {
    IUserSettingsRepository,
    UserTradingSettings,
    UserTradingSettingsUpdate,
    AccountMode,
} from '@platform/trading-domain';

export class DrizzleUserSettingsRepository implements IUserSettingsRepository {
    async findByUserId(userId: string): Promise<UserTradingSettings | null> {
        const [result] = await db
            .select()
            .from(userTradingSettings)
            .where(eq(userTradingSettings.userId, userId))
            .limit(1);

        return result ? this.toDomain(result) : null;
    }

    async upsert(userId: string, data: UserTradingSettingsUpdate): Promise<UserTradingSettings> {
        const existing = await this.findByUserId(userId);

        if (existing) {
            // Update existing settings
            const [result] = await db
                .update(userTradingSettings)
                .set({
                    defaultAccountMode: data.defaultAccountMode ?? existing.defaultAccountMode,
                    updatedAt: new Date(),
                })
                .where(eq(userTradingSettings.userId, userId))
                .returning();

            return this.toDomain(result);
        } else {
            // Create new settings
            const [result] = await db
                .insert(userTradingSettings)
                .values({
                    userId,
                    defaultAccountMode: data.defaultAccountMode ?? 'spot',
                })
                .returning();

            return this.toDomain(result);
        }
    }

    private toDomain(row: typeof userTradingSettings.$inferSelect): UserTradingSettings {
        return {
            userId: row.userId,
            defaultAccountMode: row.defaultAccountMode as AccountMode,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
}

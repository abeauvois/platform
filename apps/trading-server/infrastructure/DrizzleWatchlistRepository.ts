import { db, watchlist, eq, and } from '@platform/db';
import type { IWatchlistRepository, WatchlistItem, WatchlistItemCreate } from '@platform/trading-domain';

export class DrizzleWatchlistRepository implements IWatchlistRepository {
    async add(data: WatchlistItemCreate): Promise<WatchlistItem> {
        const [result] = await db
            .insert(watchlist)
            .values({
                id: data.id,
                userId: data.userId,
                symbol: data.symbol.toUpperCase(), // Normalize to uppercase
            })
            .returning();

        return this.toDomain(result);
    }

    async remove(userId: string, symbol: string): Promise<boolean> {
        const result = await db
            .delete(watchlist)
            .where(
                and(
                    eq(watchlist.userId, userId),
                    eq(watchlist.symbol, symbol.toUpperCase())
                )
            )
            .returning();

        return result.length > 0;
    }

    async findByUserId(userId: string): Promise<Array<WatchlistItem>> {
        const results = await db
            .select()
            .from(watchlist)
            .where(eq(watchlist.userId, userId));

        return results.map((r) => this.toDomain(r));
    }

    async exists(userId: string, symbol: string): Promise<boolean> {
        const [result] = await db
            .select({ id: watchlist.id })
            .from(watchlist)
            .where(
                and(
                    eq(watchlist.userId, userId),
                    eq(watchlist.symbol, symbol.toUpperCase())
                )
            )
            .limit(1);

        return !!result;
    }

    async updateReference(userId: string, symbol: string, timestamp: number | null): Promise<boolean> {
        const result = await db
            .update(watchlist)
            .set({ referenceTimestamp: timestamp })
            .where(
                and(
                    eq(watchlist.userId, userId),
                    eq(watchlist.symbol, symbol.toUpperCase())
                )
            )
            .returning();

        return result.length > 0;
    }

    private toDomain(row: typeof watchlist.$inferSelect): WatchlistItem {
        return {
            id: row.id,
            userId: row.userId,
            symbol: row.symbol,
            createdAt: row.createdAt,
            referenceTimestamp: row.referenceTimestamp,
        };
    }
}

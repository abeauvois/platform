import { db, bookmarks, eq, and, gte } from '@platform/db';
import { Bookmark, type ILinkRepository, type SourceAdapter, type FileType } from '@platform/platform-domain';

export class DrizzleBookmarkRepository implements ILinkRepository {
    async exists(url: string): Promise<boolean> {
        const [result] = await db
            .select({ id: bookmarks.id })
            .from(bookmarks)
            .where(eq(bookmarks.url, url))
            .limit(1);
        return !!result;
    }

    async findByUrl(url: string): Promise<Bookmark | null> {
        const [result] = await db
            .select()
            .from(bookmarks)
            .where(eq(bookmarks.url, url));
        return result ? this.toDomain(result) : null;
    }

    async findById(id: string): Promise<Bookmark | null> {
        const [result] = await db
            .select()
            .from(bookmarks)
            .where(eq(bookmarks.id, id));
        return result ? this.toDomain(result) : null;
    }

    async save(link: Bookmark): Promise<Bookmark> {
        const id = link.id || `bookmark-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const [result] = await db
            .insert(bookmarks)
            .values({
                id,
                userId: link.userId || '',
                url: link.url,
                sourceAdapter: link.sourceAdapter,
                tags: link.tags,
                summary: link.summary,
                rawContent: link.rawContent,
                contentType: link.contentType,
                createdAt: link.createdAt,
                updatedAt: link.updatedAt,
            })
            .returning();
        return this.toDomain(result);
    }

    async saveMany(links: Bookmark[]): Promise<Bookmark[]> {
        if (links.length === 0) return [];

        const values = links.map((link) => ({
            id: link.id || `bookmark-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            userId: link.userId || '',
            url: link.url,
            sourceAdapter: link.sourceAdapter,
            tags: link.tags,
            summary: link.summary,
            rawContent: link.rawContent,
            contentType: link.contentType,
            createdAt: link.createdAt,
            updatedAt: link.updatedAt,
        }));

        const results = await db.insert(bookmarks).values(values).returning();
        return results.map((r) => this.toDomain(r));
    }

    async update(id: string, userId: string, updates: Partial<Bookmark>): Promise<Bookmark | null> {
        const [result] = await db
            .update(bookmarks)
            .set({
                ...(updates.url && { url: updates.url }),
                ...(updates.sourceAdapter && { sourceAdapter: updates.sourceAdapter }),
                ...(updates.tags && { tags: updates.tags }),
                ...(updates.summary !== undefined && { summary: updates.summary }),
                ...(updates.rawContent !== undefined && { rawContent: updates.rawContent }),
                ...(updates.contentType && { contentType: updates.contentType }),
                updatedAt: new Date(),
            })
            .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)))
            .returning();
        return result ? this.toDomain(result) : null;
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const result = await db
            .delete(bookmarks)
            .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)))
            .returning({ id: bookmarks.id });
        return result.length > 0;
    }

    async findAll(): Promise<Bookmark[]> {
        const results = await db.select().from(bookmarks);
        return results.map((r) => this.toDomain(r));
    }

    async findByUserId(userId: string): Promise<Bookmark[]> {
        const results = await db
            .select()
            .from(bookmarks)
            .where(eq(bookmarks.userId, userId));
        return results.map((r) => this.toDomain(r));
    }

    async findByUserIdSince(userId: string, since: Date): Promise<Bookmark[]> {
        const results = await db
            .select()
            .from(bookmarks)
            .where(and(eq(bookmarks.userId, userId), gte(bookmarks.createdAt, since)));
        return results.map((r) => this.toDomain(r));
    }

    async clear(): Promise<void> {
        await db.delete(bookmarks);
    }

    private toDomain(row: typeof bookmarks.$inferSelect): Bookmark {
        return new Bookmark(
            row.url,
            row.userId,
            row.sourceAdapter as SourceAdapter,
            row.tags,
            row.summary,
            row.rawContent,
            row.createdAt,
            row.updatedAt,
            row.contentType as FileType,
            row.id
        );
    }
}

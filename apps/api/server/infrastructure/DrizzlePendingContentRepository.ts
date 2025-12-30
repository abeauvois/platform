import { db, pendingContent, eq, and } from '@platform/db';
import {
    PendingContent,
    PendingContentStatus,
    type IPendingContentRepository,
    type SourceAdapter,
    type FileType,
} from '@platform/platform-domain';

export class DrizzlePendingContentRepository implements IPendingContentRepository {
    async save(content: PendingContent): Promise<PendingContent> {
        const id = content.id || `pending-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const [result] = await db
            .insert(pendingContent)
            .values({
                id,
                userId: content.userId,
                url: content.url,
                sourceAdapter: content.sourceAdapter,
                externalId: content.externalId || null,
                rawContent: content.rawContent,
                contentType: content.contentType,
                status: content.status,
                createdAt: content.createdAt,
                updatedAt: content.updatedAt,
            })
            .returning();
        return this.toDomain(result);
    }

    async saveMany(contents: PendingContent[]): Promise<PendingContent[]> {
        if (contents.length === 0) return [];

        const values = contents.map((content) => ({
            id: content.id || `pending-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            userId: content.userId,
            url: content.url,
            sourceAdapter: content.sourceAdapter,
            externalId: content.externalId || null,
            rawContent: content.rawContent,
            contentType: content.contentType,
            status: content.status,
            createdAt: content.createdAt,
            updatedAt: content.updatedAt,
        }));

        const results = await db.insert(pendingContent).values(values).returning();
        return results.map((r) => this.toDomain(r));
    }

    async findPendingByUserId(userId: string): Promise<PendingContent[]> {
        const results = await db
            .select()
            .from(pendingContent)
            .where(and(eq(pendingContent.userId, userId), eq(pendingContent.status, 'pending')));
        return results.map((r) => this.toDomain(r));
    }

    async findAllPending(): Promise<PendingContent[]> {
        const results = await db
            .select()
            .from(pendingContent)
            .where(eq(pendingContent.status, 'pending'));
        return results.map((r) => this.toDomain(r));
    }

    async updateStatus(id: string, status: PendingContentStatus): Promise<void> {
        await db
            .update(pendingContent)
            .set({
                status,
                updatedAt: new Date(),
            })
            .where(eq(pendingContent.id, id));
    }

    async existsByExternalId(
        userId: string,
        sourceAdapter: string,
        externalId: string
    ): Promise<boolean> {
        const [result] = await db
            .select({ id: pendingContent.id })
            .from(pendingContent)
            .where(
                and(
                    eq(pendingContent.userId, userId),
                    eq(pendingContent.sourceAdapter, sourceAdapter),
                    eq(pendingContent.externalId, externalId)
                )
            )
            .limit(1);
        return !!result;
    }

    async findById(id: string): Promise<PendingContent | null> {
        const [result] = await db
            .select()
            .from(pendingContent)
            .where(eq(pendingContent.id, id));
        return result ? this.toDomain(result) : null;
    }

    private toDomain(row: typeof pendingContent.$inferSelect): PendingContent {
        return new PendingContent(
            row.url,
            row.sourceAdapter as SourceAdapter,
            row.rawContent,
            row.contentType as FileType,
            row.status as PendingContentStatus,
            row.userId,
            row.id,
            row.externalId || undefined,
            row.createdAt,
            row.updatedAt
        );
    }
}

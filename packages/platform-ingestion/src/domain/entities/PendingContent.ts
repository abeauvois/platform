import type { SourceAdapter } from "./SourceAdapter.js";
import type { FileType } from "./RawFile.js";

/**
 * Status lifecycle for pending content:
 * - pending: Awaiting enrichment processing
 * - processing: Currently being enriched
 * - archived: Enrichment complete, bookmarks created
 */
export type PendingContentStatus = 'pending' | 'processing' | 'archived';

/**
 * Domain Entity: Represents raw content awaiting enrichment
 *
 * This is a staging entity that holds content before it gets
 * enriched and converted into Bookmark entities.
 */
export class PendingContent {
    constructor(
        public readonly url: string,
        public readonly sourceAdapter: SourceAdapter,
        public readonly rawContent: string,
        public readonly contentType: FileType,
        public readonly status: PendingContentStatus,
        public readonly userId: string,
        public readonly id?: string,
        public readonly externalId?: string,
        public readonly createdAt: Date = new Date(),
        public readonly updatedAt: Date = new Date()
    ) {}

    /**
     * Creates a new PendingContent with updated status
     */
    withStatus(status: PendingContentStatus): PendingContent {
        return new PendingContent(
            this.url,
            this.sourceAdapter,
            this.rawContent,
            this.contentType,
            status,
            this.userId,
            this.id,
            this.externalId,
            this.createdAt,
            new Date()
        );
    }

    /**
     * Creates a new PendingContent with updated timestamp
     */
    withUpdatedTimestamp(): PendingContent {
        return new PendingContent(
            this.url,
            this.sourceAdapter,
            this.rawContent,
            this.contentType,
            this.status,
            this.userId,
            this.id,
            this.externalId,
            this.createdAt,
            new Date()
        );
    }

    isValid(): boolean {
        return this.url.length > 0 && this.sourceAdapter !== 'None' && this.userId.length > 0;
    }

    isPending(): boolean {
        return this.status === 'pending';
    }

    isProcessing(): boolean {
        return this.status === 'processing';
    }

    isArchived(): boolean {
        return this.status === 'archived';
    }
}

import { BaseContent } from "./BaseContent";
import type { FileType } from "./RawFile";
import type { SourceAdapter } from "./SourceAdapter";

/**
 * Domain Entity: Represents an extracted email link with metadata
 */
export class Bookmark implements BaseContent {
    constructor(
        public readonly url: string,
        public readonly userId: string,
        public readonly sourceAdapter: SourceAdapter = 'None',
        public readonly tags: string[] = [],
        public readonly summary: string = '',
        public readonly rawContent: string = '',
        public readonly createdAt: Date = new Date(),
        public readonly updatedAt: Date = new Date(),
        public readonly contentType: FileType = 'unknown',
        public readonly id?: string
    ) { }

    /**
     * Creates a new Bookmark with updated categorization
     */
    withCategorization(tags: string[], summary: string): Bookmark {
        return new Bookmark(
            this.url,
            this.userId,
            this.sourceAdapter,
            tags,
            summary,
            this.rawContent,
            this.createdAt,
            new Date(), // Update the updatedAt timestamp
            this.contentType,
            this.id
        );
    }

    /**
     * Creates a new Bookmark with updated timestamp
     */
    withUpdatedTimestamp(): Bookmark {
        return new Bookmark(
            this.url,
            this.userId,
            this.sourceAdapter,
            this.tags,
            this.summary,
            this.rawContent,
            this.createdAt,
            new Date(), // Update the updatedAt timestamp
            this.contentType,
            this.id
        );
    }

    isValid(): boolean {
        return this.url.length > 0 && this.sourceAdapter !== 'None';
    }
    isEnriched(): boolean {
        return this.isValid() && this.tags.length > 0 && this.summary.length > 0;
    }
}

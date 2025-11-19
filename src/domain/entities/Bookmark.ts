import { SourceAdapter } from "./SourceAdapter";

/**
 * Domain Entity: Represents an extracted email link with metadata
 */
export class Bookmark {
    constructor(
        public readonly url: string,
        public readonly sourceAdapter: SourceAdapter = SourceAdapter.None,
        public readonly tags: string[] = [],
        public readonly summary: string = '',
        public readonly rawContent: string = '',
        public readonly createdAt: Date = new Date(),
        public readonly updatedAt: Date = new Date()
    ) { }

    /**
     * Creates a new Bookmark with updated categorization
     */
    withCategorization(tags: string[], summary: string): Bookmark {
        return new Bookmark(
            this.url,
            this.sourceAdapter,
            tags,
            summary,
            this.rawContent,
            this.createdAt,
            new Date() // Update the updatedAt timestamp
        );
    }

    /**
     * Creates a new Bookmark with updated timestamp
     */
    withUpdatedTimestamp(): Bookmark {
        return new Bookmark(
            this.url,
            this.sourceAdapter,
            this.tags,
            this.summary,
            this.rawContent,
            this.createdAt,
            new Date() // Update the updatedAt timestamp
        );
    }

    isValid(): boolean {
        return this.url.length > 0 && this.sourceAdapter !== SourceAdapter.None;
    }
    isEnriched(): boolean {
        return this.isValid() && this.tags.length > 0 && this.summary.length > 0;
    }
}

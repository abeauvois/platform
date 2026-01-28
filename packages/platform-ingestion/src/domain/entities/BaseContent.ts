import type { SourceAdapter } from "./SourceAdapter.js";
import type { FileType } from "./RawFile.js";

/**
 * Domain Entity: Represents extracted content with metadata
 */
export class BaseContent {
    constructor(
        public readonly url: string,
        public readonly sourceAdapter: SourceAdapter = 'None',
        public readonly tags: Array<string> = [],
        public readonly summary: string = '',
        public readonly rawContent: string = '',
        public readonly createdAt: Date = new Date(),
        public readonly updatedAt: Date = new Date(),
        public readonly contentType: FileType = 'unknown'
    ) { }

    /**
     * Creates a new BaseContent with updated categorization
     */
    withCategorization(tags: Array<string>, summary: string): BaseContent {
        return new BaseContent(
            this.url,
            this.sourceAdapter,
            tags,
            summary,
            this.rawContent,
            this.createdAt,
            new Date(), // Update the updatedAt timestamp
            this.contentType
        );
    }

    /**
     * Creates a new BaseContent with updated timestamp
     */
    withUpdatedTimestamp(): BaseContent {
        return new BaseContent(
            this.url,
            this.sourceAdapter,
            this.tags,
            this.summary,
            this.rawContent,
            this.createdAt,
            new Date(), // Update the updatedAt timestamp
            this.contentType
        );
    }

    isValid(): boolean {
        return this.url.length > 0 && this.sourceAdapter !== 'None';
    }
    isEnriched(): boolean {
        return this.isValid() && this.tags.length > 0 && this.summary.length > 0;
    }
}

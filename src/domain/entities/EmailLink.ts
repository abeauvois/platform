/**
 * Domain Entity: Represents an extracted email link with metadata
 */
export class EmailLink {
    constructor(
        public readonly url: string,
        public readonly tag: string = '',
        public readonly description: string = '',
        public readonly sourceFile: string = ''
    ) { }

    /**
     * Creates a new EmailLink with updated categorization
     */
    withCategorization(tag: string, description: string): EmailLink {
        return new EmailLink(this.url, tag, description, this.sourceFile);
    }

    /**
     * Validates the link has required fields for export
     */
    isComplete(): boolean {
        return this.url.length > 0 && this.tag.length > 0 && this.description.length > 0;
    }
}

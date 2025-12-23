/**
 * Domain Entity: Represents extracted content with metadata
 */
export class BaseContent {
    url;
    sourceAdapter;
    tags;
    summary;
    rawContent;
    createdAt;
    updatedAt;
    contentType;
    constructor(url, sourceAdapter = 'None', tags = [], summary = '', rawContent = '', createdAt = new Date(), updatedAt = new Date(), contentType = 'unknown') {
        this.url = url;
        this.sourceAdapter = sourceAdapter;
        this.tags = tags;
        this.summary = summary;
        this.rawContent = rawContent;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.contentType = contentType;
    }
    /**
     * Creates a new BaseContent with updated categorization
     */
    withCategorization(tags, summary) {
        return new BaseContent(this.url, this.sourceAdapter, tags, summary, this.rawContent, this.createdAt, new Date(), // Update the updatedAt timestamp
        this.contentType);
    }
    /**
     * Creates a new BaseContent with updated timestamp
     */
    withUpdatedTimestamp() {
        return new BaseContent(this.url, this.sourceAdapter, this.tags, this.summary, this.rawContent, this.createdAt, new Date(), // Update the updatedAt timestamp
        this.contentType);
    }
    isValid() {
        return this.url.length > 0 && this.sourceAdapter !== 'None';
    }
    isEnriched() {
        return this.isValid() && this.tags.length > 0 && this.summary.length > 0;
    }
}

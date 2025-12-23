/**
 * Domain Entity: Represents an extracted email link with metadata
 */
export class Bookmark {
    url;
    sourceAdapter;
    tags;
    summary;
    rawContent;
    createdAt;
    updatedAt;
    contentType;
    userId;
    id;
    constructor(url, sourceAdapter = 'None', tags = [], summary = '', rawContent = '', createdAt = new Date(), updatedAt = new Date(), contentType = 'unknown', userId, id) {
        this.url = url;
        this.sourceAdapter = sourceAdapter;
        this.tags = tags;
        this.summary = summary;
        this.rawContent = rawContent;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.contentType = contentType;
        this.userId = userId;
        this.id = id;
    }
    /**
     * Creates a new Bookmark with updated categorization
     */
    withCategorization(tags, summary) {
        return new Bookmark(this.url, this.sourceAdapter, tags, summary, this.rawContent, this.createdAt, new Date(), // Update the updatedAt timestamp
        this.contentType, this.userId, this.id);
    }
    /**
     * Creates a new Bookmark with updated timestamp
     */
    withUpdatedTimestamp() {
        return new Bookmark(this.url, this.sourceAdapter, this.tags, this.summary, this.rawContent, this.createdAt, new Date(), // Update the updatedAt timestamp
        this.contentType, this.userId, this.id);
    }
    isValid() {
        return this.url.length > 0 && this.sourceAdapter !== 'None';
    }
    isEnriched() {
        return this.isValid() && this.tags.length > 0 && this.summary.length > 0;
    }
}

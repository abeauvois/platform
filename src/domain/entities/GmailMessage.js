/**
 * Domain Entity: GmailMessage
 *
 * Represents a Gmail message with core business data.
 * This is a pure domain entity with no external dependencies.
 */
export class GmailMessage {
    id;
    subject;
    from;
    receivedAt;
    snippet;
    rawContent;
    constructor(id, subject, from, receivedAt, snippet, rawContent) {
        this.id = id;
        this.subject = subject;
        this.from = from;
        this.receivedAt = receivedAt;
        this.snippet = snippet;
        this.rawContent = rawContent;
    }
    /**
     * Get a formatted string representation of the message
     */
    toString() {
        return `[${this.receivedAt.toISOString()}] ${this.from}: ${this.subject}`;
    }
    /**
     * Get a raw string representation of the message
     */
    toRawString() {
        return `[${this.receivedAt.toISOString()}] ${this.rawContent}`;
    }
    /**
     * Check if this message was received after a given date
     */
    isNewerThan(date) {
        return this.receivedAt > date;
    }
}

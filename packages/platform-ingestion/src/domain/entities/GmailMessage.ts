/**
 * Domain Entity: GmailMessage
 *
 * Represents a Gmail message with core business data.
 * This is a pure domain entity with no external dependencies.
 */

export class GmailMessage {
    public readonly id: string;
    public readonly subject: string;
    public readonly from: string;
    public readonly to: string;
    public readonly receivedAt: Date;
    public readonly snippet: string;
    public readonly rawContent: string;

    constructor(
        id: string,
        subject: string,
        from: string,
        to: string,
        receivedAt: Date,
        snippet: string,
        rawContent: string
    ) {
        this.id = id;
        this.subject = subject;
        this.from = from;
        this.to = to;
        this.receivedAt = receivedAt;
        this.snippet = snippet;
        this.rawContent = rawContent;
    }

    /**
     * Get a formatted string representation of the message
     */
    public toString(): string {
        return `[${this.receivedAt.toISOString()}] ${this.from}: ${this.subject}`;
    }

    /**
     * Get a raw string representation of the message
     */
    public toRawString(): string {
        return `[${this.receivedAt.toISOString()}] ${this.rawContent}`;
    }

    /**
     * Check if this message was received after a given date
     */
    public isNewerThan(date: Date): boolean {
        return this.receivedAt > date;
    }
}

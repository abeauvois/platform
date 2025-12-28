import { google, gmail_v1 } from 'googleapis';
import { GmailMessage } from '@platform/platform-domain';
import { truncateText } from '@platform/utils';

/**
 * Port: IEmailClient interface
 * Defined here to avoid circular dependencies with platform-domain
 */
export interface IEmailClient {
    fetchMessagesSince(since: Date, filterEmail?: string, withUrl?: boolean): Promise<GmailMessage[]>;
}

export interface GmailCredentials {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
}

/**
 * Normalized headers extracted from Gmail message
 */
interface NormalizedHeaders {
    subject: string;
    from: string;
    to: string;
    date: string;
    receivedAt: Date;
    url: string;
}

/**
 * Normalized message content
 */
interface NormalizedContent {
    body: string;
    rawContent: string;
    snippet: string;
}

/** Headers to preserve in the raw content summary */
const PRESERVED_HEADERS = ['from', 'to', 'subject', 'date', 'url'] as const;

/** URL regex pattern for detecting HTTP/HTTPS URLs */
const URL_REGEX = /(https?:\/\/[^\s<>"')\]]+)/g;

/** Maximum length for subject before truncation */
const MAX_SUBJECT_LENGTH = 100;

/**
 * Gmail API Client - Infrastructure adapter implementing IEmailClient
 * Uses Google APIs to fetch Gmail messages
 */
export class GmailApiClient implements IEmailClient {
    private readonly gmail: gmail_v1.Gmail;

    constructor(credentials: GmailCredentials) {
        const oauth2Client = new google.auth.OAuth2(
            credentials.clientId,
            credentials.clientSecret
        );

        oauth2Client.setCredentials({
            refresh_token: credentials.refreshToken,
        });

        this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    }

    /**
     * Fetch Gmail messages received since a specific date
     * @param since - Only fetch messages after this date
     * @param filterEmail - Only fetch messages from this email address
     * @param withUrl - If true, only return messages that contain URLs
     */
    async fetchMessagesSince(since: Date, filterEmail?: string, withUrl?: boolean): Promise<GmailMessage[]> {
        const messages: GmailMessage[] = [];
        const query = this.buildSearchQuery(since, filterEmail);

        try {
            const listResponse = await this.gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 100,
            });

            const messageList = listResponse.data.messages || [];

            for (const msg of messageList) {
                if (!msg.id) continue;

                const fullMessage = await this.fetchMessageDetails(msg.id);
                if (fullMessage) {
                    if (withUrl && !this.containsUrl(fullMessage.rawContent)) {
                        continue;
                    }
                    messages.push(fullMessage);
                }
            }

            return messages;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch Gmail messages: ${errorMessage}`);
        }
    }

    /**
     * Build Gmail search query string
     */
    private buildSearchQuery(since: Date, filterEmail?: string): string {
        const afterTimestamp = Math.floor(since.getTime() / 1000);
        let query = `after:${afterTimestamp}`;

        if (filterEmail) {
            query += ` from:${filterEmail}`;
        }

        return query;
    }

    /**
     * Check if content contains a URL
     */
    private containsUrl(content: string): boolean {
        return URL_REGEX.test(content);
    }

    /**
     * Extract first URL from content
     */
    private extractUrl(content: string): string {
        // Reset regex lastIndex before using
        URL_REGEX.lastIndex = 0;
        const match = URL_REGEX.exec(content);
        return match ? match[0] : '';
    }

    /**
     * Normalize headers from Gmail message payload
     * Extracts and structures relevant headers into a consistent format
     */
    private normalizeHeaders(headers: gmail_v1.Schema$MessagePartHeader[]): NormalizedHeaders {
        const getHeader = (name: string): string => {
            const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
            return header?.value || '';
        };

        const subject = getHeader('Subject');
        const from = getHeader('From');
        const to = getHeader('To');
        const dateStr = getHeader('Date');
        const receivedAt = dateStr ? new Date(dateStr) : new Date();

        // Extract URL from subject if present
        const urlFromSubject = this.extractUrl(subject);

        return {
            subject,
            from,
            to,
            date: dateStr,
            receivedAt,
            url: urlFromSubject,
        };
    }

    /**
     * Normalize body content and extract URL if not already found in headers
     * @param payload - Gmail message payload
     * @param headers - Already normalized headers (may be mutated to add URL and truncate subject)
     */
    private normalizeBody(
        payload: gmail_v1.Schema$MessagePart | undefined,
        headers: NormalizedHeaders,
        snippet: string
    ): NormalizedContent {
        let body = this.extractBodyContent(payload);

        // If no URL found in subject, try to extract from body
        if (!headers.url) {
            headers.url = this.extractUrl(body);
        }

        // If subject is too long, prepend full subject to body and truncate the header
        const originalSubject = headers.subject;
        if (originalSubject.length > MAX_SUBJECT_LENGTH) {
            body = `[Full Subject]: ${originalSubject}\n\n${body}`;
            headers.subject = truncateText(originalSubject, MAX_SUBJECT_LENGTH);
        }

        // Build header summary for raw content
        const headerEntries: Array<{ name: string; value: string }> = [
            { name: 'from', value: headers.from },
            { name: 'to', value: headers.to },
            { name: 'subject', value: headers.subject },
            { name: 'date', value: headers.date },
            { name: 'url', value: headers.url },
        ];

        const headerSummary = headerEntries
            .filter(h => h.value && PRESERVED_HEADERS.includes(h.name as typeof PRESERVED_HEADERS[number]))
            .map(h => `${h.name}: ${h.value}`)
            .join('\n');

        const rawContent = headerSummary + '\n' + body;

        return {
            body,
            rawContent,
            snippet,
        };
    }

    /**
     * Fetch full details for a single message
     */
    private async fetchMessageDetails(messageId: string): Promise<GmailMessage | null> {
        try {
            const response = await this.gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'full',
            });

            const message = response.data;
            if (!message) return null;

            const rawHeaders = message.payload?.headers || [];
            const headers = this.normalizeHeaders(rawHeaders);
            const content = this.normalizeBody(
                message.payload,
                headers,
                message.snippet || ''
            );

            return new GmailMessage(
                messageId,
                headers.subject,
                headers.from,
                headers.receivedAt,
                content.snippet,
                content.rawContent
            );
        } catch (error) {
            console.error(`Failed to fetch message ${messageId}:`, error);
            return null;
        }
    }

    /**
     * Extract body content from message payload
     * Prefers text/plain, falls back to text/html (stripped of tags)
     */
    private extractBodyContent(payload: gmail_v1.Schema$MessagePart | undefined): string {
        if (!payload) return '';

        // Check for direct body data
        if (payload.body?.data) {
            return this.decodeBase64(payload.body.data);
        }

        // Check for multipart content
        if (payload.parts) {
            // Prefer text/plain
            const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
            if (textPart?.body?.data) {
                return this.decodeBase64(textPart.body.data);
            }

            // Fallback to text/html
            const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
            if (htmlPart?.body?.data) {
                return this.stripHtml(this.decodeBase64(htmlPart.body.data));
            }

            // Recursively check nested parts
            for (const part of payload.parts) {
                const content = this.extractBodyContent(part);
                if (content) return content;
            }
        }

        return '';
    }

    /**
     * Decode base64url encoded string
     */
    private decodeBase64(data: string): string {
        // Gmail uses URL-safe base64 encoding
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(base64, 'base64').toString('utf-8');
    }

    /**
     * Strip HTML tags from content
     */
    private stripHtml(html: string): string {
        return html
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}

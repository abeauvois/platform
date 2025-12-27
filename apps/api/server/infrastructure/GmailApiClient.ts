import { google, gmail_v1 } from 'googleapis';
import { GmailMessage } from '@platform/platform-domain';

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

        // Build Gmail search query
        const afterTimestamp = Math.floor(since.getTime() / 1000);
        let query = `after:${afterTimestamp}`;

        if (filterEmail) {
            query += ` from:${filterEmail}`;
        }

        try {
            // Get message list
            const listResponse = await this.gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 100,
            });

            const messageList = listResponse.data.messages || [];

            // Fetch full message details for each message
            for (const msg of messageList) {
                if (!msg.id) continue;

                const fullMessage = await this.fetchMessageDetails(msg.id);
                if (fullMessage) {
                    // Filter by URL presence if withUrl is true
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
     * Check if content contains a URL
     */
    private containsUrl(content: string): boolean {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return urlRegex.test(content);
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

            // Extract headers
            const headers = message.payload?.headers || [];
            const getHeader = (name: string): string => {
                const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
                return header?.value || '';
            };

            const subject = getHeader('Subject');
            const from = getHeader('From');
            const dateStr = getHeader('Date');
            const receivedAt = dateStr ? new Date(dateStr) : new Date();

            const bodyContent = this.extractBodyContent(message.payload);

            const keepHeaders = (name: string) => {
                const lowerName = name.toLowerCase();
                return ['from', 'to', 'subject', 'date', 'has-url'].includes(lowerName);
            }

            const includesUrl = (content: string) => {
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                return urlRegex.test(content);
            }

            const getUrl = () => {
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const match = urlRegex.exec(bodyContent);
                return match ? match[0] : '';
            }

            if (includesUrl(bodyContent)) {
                const url = getUrl();
                headers.push({ name: 'url', value: url });
            }

            const headerSummary = headers.filter(h => h.name && keepHeaders(h.name)).map(h => `${h.name}: ${h.value}`).join('\n')
            // Extract body content
            const rawContent = headerSummary + '\n' + bodyContent;
            const snippet = message.snippet || '';

            return new GmailMessage(
                messageId,
                subject,
                from,
                receivedAt,
                snippet,
                rawContent
            );
        } catch (error) {
            console.error(`Failed to fetch message ${messageId}:`, error);
            return null;
        }
    }

    /**
     * Extract body content from message payload
     */
    private extractBodyContent(payload: gmail_v1.Schema$MessagePart | undefined): string {
        if (!payload) return '';

        // Check for direct body data
        if (payload.body?.data) {
            return this.decodeBase64(payload.body.data);
        }

        // Check for multipart content
        if (payload.parts) {
            // Prefer text/plain, fallback to text/html
            const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
            if (textPart?.body?.data) {
                return this.decodeBase64(textPart.body.data);
            }

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

import { google, gmail_v1 } from 'googleapis';
import { truncateText } from '@abeauvois/platform-utils';
import { GmailMessage } from '../../domain/entities/GmailMessage.js';
import type { IEmailClient } from '../../domain/ports/IEmailClient.js';
import type { IUrlExtractor } from '../../domain/ports/IUrlExtractor.js';
import { UrlExtractor } from '../UrlExtractor.js';

export interface GmailCredentials {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
}

/** Maximum length for subject before truncation */
const MAX_SUBJECT_LENGTH = 100;

/**
 * Gmail API Client - Infrastructure adapter implementing IEmailClient
 * Uses Google APIs to fetch Gmail messages
 */
export class GmailApiClient implements IEmailClient {
    private readonly gmail: gmail_v1.Gmail;
    private readonly urlExtractor: IUrlExtractor;

    constructor(credentials: GmailCredentials, urlExtractor: IUrlExtractor = new UrlExtractor()) {
        const oauth2Client = new google.auth.OAuth2(
            credentials.clientId,
            credentials.clientSecret
        );

        oauth2Client.setCredentials({
            refresh_token: credentials.refreshToken,
        });

        this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        this.urlExtractor = urlExtractor;
    }

    /**
     * Fetch Gmail messages received since a specific date
     * @param since - Only fetch messages after this date
     * @param filterEmail - Only fetch messages from this email address
     * @param withUrl - If true, only return messages that contain URLs
     */
    async fetchMessagesSince(since: Date, filterEmail?: string, withUrl?: boolean): Promise<Array<GmailMessage>> {
        const messages: Array<GmailMessage> = [];
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
                    if (withUrl && !this.urlExtractor.containsUrl(fullMessage.rawContent)) {
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
     * Get header value by name (case-insensitive)
     */
    private getHeader(headers: Array<gmail_v1.Schema$MessagePartHeader>, name: string): string {
        const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
        return header?.value || '';
    }

    /**
     * Build LLM-friendly raw content from message parts
     */
    private buildRawContent(
        headers: Array<gmail_v1.Schema$MessagePartHeader>,
        payload: gmail_v1.Schema$MessagePart | undefined
    ): { rawContent: string; subject: string } {
        const from = this.getHeader(headers, 'From');
        const to = this.getHeader(headers, 'To');
        const date = this.getHeader(headers, 'Date');
        let subject = this.getHeader(headers, 'Subject');
        let truncatedSubject = subject

        // Extract and decode body
        let body = this.extractBodyContent(payload);

        // Extract URL from subject first, then body
        const url = this.urlExtractor.extractFirst(subject) || this.urlExtractor.extractFirst(body);
        const subjectHasUrl = this.urlExtractor.containsUrl(subject);

        // Handle long subjects
        let subjectForContent = subject;
        if (subject.length > MAX_SUBJECT_LENGTH) {
            body = `[Full Subject]: ${subject}\n\n${body}`;
            truncatedSubject = truncateText(subject, MAX_SUBJECT_LENGTH);
            subjectForContent = subject;
        }

        // Build header summary
        const headerLines = [
            from && `from: ${from}`,
            to && `to: ${to}`,
            subjectForContent && `subject: ${subjectForContent}`,
            date && `date: ${date}`,
            url && `url: ${url}`,
        ].filter(Boolean).join('\n');

        return {
            rawContent: headerLines + '\n' + body,
            subject: subjectHasUrl ? url : truncatedSubject,
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

            const headers = message.payload?.headers || [];
            const from = this.getHeader(headers, 'From');
            const to = this.getHeader(headers, 'To');
            const date = this.getHeader(headers, 'Date');
            const { rawContent, subject } = this.buildRawContent(headers, message.payload);

            return new GmailMessage(
                messageId,
                subject,
                from,
                to,
                date ? new Date(date) : new Date(),
                message.snippet || '',
                rawContent
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

import type { GmailMessage } from '../entities/GmailMessage.js';

/**
 * Port: Email client interface for fetching messages
 * Abstracts the underlying email provider (Gmail, Outlook, etc.)
 */
export interface IEmailClient {
    /**
     * Fetch messages received since a specific date
     * @param since Only fetch messages after this date
     * @param filterEmail Optional: Only fetch messages from this email address
     * @param withUrl Optional: If true, only return messages that contain URLs
     * @returns Array of messages
     */
    fetchMessagesSince(since: Date, filterEmail?: string, withUrl?: boolean): Promise<Array<GmailMessage>>;
}

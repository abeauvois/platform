import { GmailMessage } from '../entities/GmailMessage.js';

/**
 * Port: IEmailClient
 * 
 * Interface for fetching Email messages.
 * Implementations handle the interaction with Email API.
 * 
 * Following Hexagonal Architecture - Domain defines the interface,
 * Infrastructure provides the implementation.
 */

export interface IEmailClient {
    /**
     * Fetch messages received since a specific timestamp
     * @param since - Date to fetch messages from
     * @param filterEmail - Optional email address to filter messages by sender
     * @returns Array of Gmail messages
     */
    fetchMessagesSince(since: Date, filterEmail?: string): Promise<GmailMessage[]>;
}

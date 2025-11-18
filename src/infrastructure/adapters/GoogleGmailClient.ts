import { google } from 'googleapis';
import { IGmailClient } from '../../domain/ports/IGmailClient.js';
import { GmailMessage } from '../../domain/entities/GmailMessage.js';
import { ILogger } from '../../domain/ports/ILogger.js';

/**
 * Infrastructure Adapter: GoogleGmailClient
 * 
 * Connects to Gmail API to fetch messages.
 * Implements IGmailClient port.
 * 
 * Requires Gmail API credentials:
 * - GMAIL_CLIENT_ID
 * - GMAIL_CLIENT_SECRET
 * - GMAIL_REFRESH_TOKEN
 */

export class GoogleGmailClient implements IGmailClient {
    private gmail: any;

    constructor(
        private readonly clientId: string,
        private readonly clientSecret: string,
        private readonly refreshToken: string,
        private readonly logger: ILogger
    ) {
        this.initializeGmailClient();
    }

    private initializeGmailClient(): void {
        const oauth2Client = new google.auth.OAuth2(
            this.clientId,
            this.clientSecret,
            'urn:ietf:wg:oauth:2.0:oob' // For installed apps
        );

        oauth2Client.setCredentials({
            refresh_token: this.refreshToken,
        });

        this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    }

    async fetchMessagesSince(since: Date, filterEmail?: string): Promise<GmailMessage[]> {
        try {
            this.logger.info(`Fetching Gmail messages since ${since.toISOString()}`);

            // Convert date to Gmail query format (timestamp in seconds)
            const timestamp = Math.floor(since.getTime() / 1000);
            let query = `after:${timestamp}`;

            // Add sender filter if provided
            if (filterEmail) {
                query += ` from:${filterEmail}`;
                this.logger.info(`Filtering by sender: ${filterEmail}`);
            }

            this.logger.info(`gmail: ${query}`);

            // List messages matching the query
            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 100, // Adjust as needed
            });

            const messages = response.data.messages || [];
            this.logger.info(`Found ${messages.length} messages`);

            if (messages.length === 0) {
                return [];
            }

            // Fetch full message details for each message
            const gmailMessages: GmailMessage[] = [];

            for (const message of messages) {
                try {
                    const fullMessage = await this.gmail.users.messages.get({
                        userId: 'me',
                        id: message.id,
                        format: 'full',
                    });

                    const gmailMessage = this.parseGmailMessage(fullMessage.data);
                    if (gmailMessage) {
                        gmailMessages.push(gmailMessage);
                    }
                } catch (error) {
                    this.logger.error(
                        `Failed to fetch message ${message.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                    // Continue with other messages
                }
            }

            return gmailMessages;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Gmail API error: ${errorMessage}`);
            throw new Error(`Failed to fetch Gmail messages: ${errorMessage}`);
        }
    }

    private parseGmailMessage(messageData: any): GmailMessage | null {
        try {
            const headers = messageData.payload?.headers || [];

            // Extract headers
            const subject =
                headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
            const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown';
            const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value;

            // Parse received date
            let receivedAt: Date;
            if (dateHeader) {
                receivedAt = new Date(dateHeader);
            } else {
                // Fallback to internal date (timestamp in milliseconds)
                receivedAt = new Date(parseInt(messageData.internalDate));
            }

            // Extract snippet (preview text)
            const snippet = messageData.snippet || '';

            return new GmailMessage(messageData.id, subject, from, receivedAt, snippet);
        } catch (error) {
            this.logger.error(
                `Failed to parse message: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            return null;
        }
    }
}

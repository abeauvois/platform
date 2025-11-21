import { StructuredDataSource } from '../../domain/entities/StructuredDataSource.js';
import { BaseContent } from '../../domain/entities/BaseContent.js';
import { GmailMessage } from '../../domain/entities/GmailMessage.js';
import { SourceAdapter } from '../../domain/entities/SourceAdapter.js';
import { ApiIngestionConfig, IngestionConfig } from '../../domain/entities/IngestionConfig.js';
import { IEmailClient } from '../../domain/ports/IEmailClient.js';
import { ITimestampRepository } from '../../domain/ports/ITimestampRepository.js';
import { ILogger } from '../../domain/ports/ILogger.js';

/**
 * Gmail Data Source
 * Fetches and normalizes Gmail messages into BaseContent
 */
export class GmailDataSource extends StructuredDataSource<GmailMessage, BaseContent> {
    constructor(
        private readonly gmailClient: IEmailClient,
        private readonly timestampRepository: ITimestampRepository,
        logger: ILogger
    ) {
        super('Gmail', logger);
    }

    /**
     * Validate Gmail-specific configuration
     */
    protected async validateApiConfig(config: ApiIngestionConfig): Promise<void> {
        const { clientId, clientSecret, refreshToken } = config.credentials;

        if (!clientId || !clientSecret || !refreshToken) {
            throw new Error('Gmail requires clientId, clientSecret, and refreshToken in credentials');
        }
    }

    /**
     * Fetch Gmail messages from the API
     */
    protected async fetchRaw(config: IngestionConfig): Promise<GmailMessage[]> {
        const apiConfig = config as ApiIngestionConfig;

        // Determine the "since" timestamp
        // Priority: 1) config.since, 2) last execution time, 3) 30 days ago
        let sinceTimestamp = apiConfig.since;

        if (!sinceTimestamp) {
            const lastExecutionTime = await this.timestampRepository.getLastExecutionTime();
            sinceTimestamp = lastExecutionTime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }

        // Extract optional email filter
        const filterEmail = apiConfig.filters?.email;

        // Fetch messages from Gmail
        const messages = await this.gmailClient.fetchMessagesSince(sinceTimestamp, filterEmail);

        return messages;
    }

    /**
     * Normalize Gmail messages to BaseContent
     */
    protected async normalize(messages: GmailMessage[]): Promise<BaseContent[]> {
        return messages.map(message => new BaseContent(
            message.rawContent,           // url field - contains the raw content
            'Gmail',                      // source adapter
            [],                           // tags - empty initially
            '',                           // summary - empty initially
            message.rawContent,           // raw content
            message.receivedAt,           // created at
            message.receivedAt            // updated at (same as created initially)
        ));
    }
}

import { AbstractApiSourceReader } from './AbstractApiSourceReader.js';
import { BaseContent } from '../../domain/entities/BaseContent.js';
import { GmailMessage } from '../../domain/entities/GmailMessage.js';
import { ApiIngestionConfig, IngestionConfig } from '../../domain/entities/IngestionConfig.js';
import { IEmailClient } from '../../domain/ports/IEmailClient.js';
import { ITimestampRepository } from '../../domain/ports/ITimestampRepository.js';
import { ILogger } from '../../domain/ports/ILogger.js';

/**
 * Gmail Source Reader
 * Fetches and normalizes Gmail messages into BaseContent
 */
export class GmailSourceReader extends AbstractApiSourceReader<GmailMessage, BaseContent> {
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

        let sinceTimestamp = apiConfig.since;

        if (!sinceTimestamp) {
            const lastExecutionTime = await this.timestampRepository.getLastExecutionTime();
            sinceTimestamp = lastExecutionTime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }

        const filterEmail = apiConfig.filters?.email;

        const messages = await this.gmailClient.fetchMessagesSince(sinceTimestamp, filterEmail);

        return messages;
    }

    /**
     * Normalize Gmail messages to BaseContent
     */
    protected async normalize(messages: GmailMessage[]): Promise<BaseContent[]> {
        return messages.map(message => new BaseContent(
            message.rawContent,
            'Gmail',
            [],
            '',
            message.rawContent,
            message.receivedAt,
            message.receivedAt
        ));
    }
}

import { GmailMessage } from '../../../domain/entities/GmailMessage.js';
import { IProducer } from '../../../domain/workflow/IProducer.js';
import { IEmailClient } from '../../../domain/ports/IEmailClient.js';
import { ITimestampRepository } from '../../../domain/ports/ITimestampRepository.js';

/**
 * Producer: Fetches Gmail messages from Gmail API
 * Produces GmailMessage items for the workflow pipeline
 */
export class GmailMessageProducer implements IProducer<GmailMessage> {
    constructor(
        private readonly gmailClient: IEmailClient,
        private readonly timestampRepository: ITimestampRepository,
        private readonly filterEmail?: string
    ) { }

    async *produce(): AsyncGenerator<GmailMessage> {
        // Get last execution time
        const lastExecutionTime = await this.timestampRepository.getLastExecutionTime();

        // Determine the "since" timestamp
        // If first run, use 30 days ago as default
        const sinceTimestamp = lastExecutionTime || new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 30);

        // Fetch messages from Gmail with optional sender filter
        const messages = await this.gmailClient.fetchMessagesSince(sinceTimestamp, this.filterEmail);

        // Yield each message to the workflow
        for (const message of messages) {
            yield message;
        }

        // Save current execution time after successful fetch
        const now = new Date();
        await this.timestampRepository.saveLastExecutionTime(now);
    }
}

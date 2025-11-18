import { IConsumer } from '../../../domain/workflow/IConsumer.js';
import { GmailMessage } from '../../../domain/entities/GmailMessage.js';
import { ILogger } from '../../../domain/ports/ILogger.js';

/**
 * Consumer: Collects Gmail messages from the workflow
 * Accumulates all messages for final output
 */
export class GmailMessageCollector implements IConsumer<GmailMessage> {
    private messages: GmailMessage[] = [];

    constructor(private readonly logger: ILogger) { }

    async onStart(): Promise<void> {
        this.messages = [];
        this.logger.debug('Starting Gmail message collection...');
    }

    async consume(message: GmailMessage): Promise<void> {
        this.messages.push(message);
        this.logger.debug(`Collected message: ${message.subject}`);
    }

    async onComplete(): Promise<void> {
        this.logger.debug(`Collected ${this.messages.length} Gmail messages`);
    }

    /**
     * Get all collected messages
     */
    getMessages(): GmailMessage[] {
        return this.messages;
    }
}

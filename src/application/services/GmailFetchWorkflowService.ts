import { GmailMessage } from '../../domain/entities/GmailMessage.js';
import { IGmailClient } from '../../domain/ports/IGmailClient.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { ITimestampRepository } from '../../domain/ports/ITimestampRepository.js';
import { Pipeline, WorkflowExecutor } from '../../domain/workflow/index.js';
import { GmailMessageProducer } from '../../infrastructure/workflow/producers/GmailMessageProducer.js';
import { GmailMessageCollector } from '../../infrastructure/workflow/consumers/GmailMessageCollector.js';

/**
 * Service responsible for fetching Gmail messages using workflow pipeline
 * 
 * This service orchestrates:
 * - Producer: Fetches messages from Gmail API
 * - Pipeline: Pass-through (no transformation needed)
 * - Consumer: Collects messages for output
 */
export class GmailFetchWorkflowService {
    constructor(
        private readonly gmailClient: IGmailClient,
        private readonly timestampRepository: ITimestampRepository,
        private readonly logger: ILogger,
        private readonly filterEmail?: string
    ) { }

    /**
     * Fetch Gmail messages received since last execution
     * @returns Array of GmailMessage objects
     */
    async fetchRecentMessages(): Promise<GmailMessage[]> {
        // Create producer, pipeline, and consumer
        const producer = new GmailMessageProducer(
            this.gmailClient,
            this.timestampRepository,
            this.filterEmail
        );

        // Empty pipeline - no transformation needed for Gmail messages
        const pipeline = new Pipeline<GmailMessage, GmailMessage>();

        const consumer = new GmailMessageCollector(this.logger);

        // Create and execute workflow
        const workflow = new WorkflowExecutor<GmailMessage, GmailMessage>(
            producer,
            pipeline,
            consumer
        );

        // Execute with error handling
        await workflow.execute({
            onStart: async () => {
                this.logger.info('📧 Fetching recent Gmail messages...');
            },
            onError: async (error: Error, item: GmailMessage) => {
                this.logger.warning(`  ⚠️  Error processing message "${item.subject}": ${error.message}`);
            },
            onComplete: async (stats) => {
                this.logger.info(`✅ Found ${stats.itemsProduced} new message${stats.itemsProduced === 1 ? '' : 's'}`);
            }
        });

        // Return collected messages
        return consumer.getMessages();
    }
}

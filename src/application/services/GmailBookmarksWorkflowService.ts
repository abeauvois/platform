import { Bookmark } from '../../domain/entities/Bookmark.js';
import { GmailMessage } from '../../domain/entities/GmailMessage.js';
import { IContentAnalyser } from '../../domain/ports/IContentAnalyser.js';
import { IEmailClient } from '../../domain/ports/IEmailClient.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { ITimestampRepository } from '../../domain/ports/ITimestampRepository.js';
import { Pipeline, WorkflowExecutor } from '../../domain/workflow/index.js';

import { BookmarkCollector } from '../../infrastructure/workflow/consumers/BookmarkCollector.js';
import { GmailMessageProducer } from '../../infrastructure/workflow/producers/GmailMessageProducer.js';
import { GmailContentAnalyserStage } from '../../infrastructure/workflow/stages/GmailContentAnalyserStage.js';

export class GmailBookmarksWorkflowService {
    constructor(
        private readonly gmailClient: IEmailClient,
        private readonly anthropicClient: IContentAnalyser,
        private readonly timestampRepository: ITimestampRepository,
        private readonly filterEmail: string,
        private readonly logger: ILogger,
    ) { }

    /**
     * Fetch Gmail messages received since last execution
     * @returns Array of Bookmark objects
     */
    async fetchRecentMessages(): Promise<Bookmark[]> {
        const producer = new GmailMessageProducer(
            this.gmailClient,
            this.timestampRepository,
            this.filterEmail
        );

        const stage2 = new GmailContentAnalyserStage(this.anthropicClient);
        const pipeline = new Pipeline().addStage(stage2)//.addStage(stage2);
        const consumer = new BookmarkCollector(this.logger)
        const workflow = new WorkflowExecutor(producer, pipeline, consumer)

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

        return consumer.getBookmarks();
    }
}

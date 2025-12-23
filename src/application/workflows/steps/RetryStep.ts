import { Bookmark } from '../../../domain/entities/Bookmark';
import { ILogger } from '../../../domain/ports/ILogger';
import { RetryHandlerService } from '../../services/RetryHandlerService';
import { QueuedLink } from '../../QueuedLink.types';
import { IWorkflowStep, StepResult, WorkflowContext } from '../IWorkflowStep';

/**
 * Workflow step that handles retrying rate-limited Twitter links
 */
export class RetryStep implements IWorkflowStep<Bookmark> {
    readonly name = 'retry';

    constructor(
        private readonly retryHandler: RetryHandlerService,
        private readonly logger: ILogger
    ) {}

    async execute(context: WorkflowContext<Bookmark>): Promise<StepResult<Bookmark>> {
        const retryQueue = context.metadata.twitterRetryQueue as QueuedLink[] | undefined;

        if (!retryQueue || retryQueue.length === 0) {
            return {
                context,
                continue: true,
                message: 'No links to retry',
            };
        }

        this.logger.info(`\n🔄 Processing ${retryQueue.length} links in retry queue...`);

        const bookmarks = [...context.items];
        const allUpdatedIds = new Set(context.updatedIds);
        let queue = retryQueue;
        let cycleCount = 0;

        while (queue.length > 0) {
            cycleCount++;
            this.logger.info(`\n🔄 Retry cycle ${cycleCount}: Processing ${queue.length} link(s)`);

            const { updatedUrls, remainingQueue } = await this.retryHandler.handleRetryQueue(
                queue,
                bookmarks
            );

            updatedUrls.forEach(url => allUpdatedIds.add(url));

            if (remainingQueue.length === 0) {
                this.logger.info(`\n✅ All retries completed successfully!`);
                break;
            }

            if (remainingQueue.length === queue.length) {
                this.logger.warning(`\n⚠️  No progress made in retry cycle ${cycleCount}. Stopping retries.`);
                break;
            }

            queue = remainingQueue;
        }

        // Clear the retry queue from metadata
        const { twitterRetryQueue: _, ...restMetadata } = context.metadata;

        return {
            context: {
                ...context,
                items: bookmarks,
                updatedIds: allUpdatedIds,
                metadata: restMetadata,
            },
            continue: true,
            message: `Retry complete, ${allUpdatedIds.size} URLs updated`,
        };
    }
}

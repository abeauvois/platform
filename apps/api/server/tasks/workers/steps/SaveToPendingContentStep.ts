import {
    type IWorkflowStep,
    type WorkflowContext,
    type StepResult,
    type IPendingContentRepository,
    BaseContent,
    PendingContent,
} from '@platform/platform-domain';
import type { StepFactoryConfig } from '../presets';

/**
 * Save to pending content step - saves items to pending_content table for later enrichment
 * Use this instead of SaveToBookmarkStep when content needs enrichment before becoming bookmarks
 */
export class SaveToPendingContentStep implements IWorkflowStep<BaseContent> {
    readonly name = 'saveToPendingContent';

    constructor(
        private readonly config: StepFactoryConfig,
        private readonly pendingContentRepository: IPendingContentRepository,
        private readonly getExternalId?: (item: BaseContent) => string | undefined
    ) { }

    async execute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        const { logger, userId } = this.config;

        if (context.items.length === 0) {
            return { context, continue: true, message: 'No items to save' };
        }

        if (!userId) {
            logger.error('userId is required for SaveToPendingContentStep');
            return { context, continue: false, message: 'userId is required' };
        }

        logger.info(`Saving ${context.items.length} items to pending_content...`);

        try {
            // Convert BaseContent to PendingContent
            const pendingItems: PendingContent[] = [];

            for (const item of context.items) {
                const externalId = this.getExternalId?.(item);

                // Check for duplicates if we have an external ID
                if (externalId) {
                    const exists = await this.pendingContentRepository.existsByExternalId(
                        userId,
                        item.sourceAdapter,
                        externalId
                    );
                    if (exists) {
                        logger.info(`Skipping duplicate: ${externalId}`);
                        continue;
                    }
                }

                pendingItems.push(
                    new PendingContent(
                        item.url,
                        item.sourceAdapter,
                        item.rawContent,
                        item.contentType,
                        'pending',
                        userId,
                        undefined,
                        externalId,
                        item.createdAt,
                        item.updatedAt
                    )
                );
            }

            if (pendingItems.length > 0) {
                await this.pendingContentRepository.saveMany(pendingItems);
                logger.info(`Saved ${pendingItems.length} items to pending_content`);
            } else {
                logger.info('No new items to save (all duplicates)');
            }

            // Notify progress for each item
            for (let i = 0; i < context.items.length; i++) {
                if (context.onItemProcessed) {
                    await context.onItemProcessed({
                        item: context.items[i],
                        index: i,
                        total: context.items.length,
                        stepName: this.name,
                        success: true,
                    });
                }
            }
        } catch (error) {
            logger.error(`Failed to save to pending_content: ${error}`);
            // Continue workflow despite save failure
        }

        return {
            context,
            continue: true,
            message: `Saved ${context.items.length} items to pending_content`,
        };
    }
}

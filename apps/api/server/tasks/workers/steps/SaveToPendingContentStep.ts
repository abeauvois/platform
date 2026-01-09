import { toPendingContent } from './utils';
import { BaseWorkflowStep } from './BaseWorkflowStep';
import type {
    BaseContent, IPendingContentRepository, StepResult, WorkflowContext
} from '@platform/platform-domain';
import type { StepFactoryConfig } from '../presets';

/**
 * Save to pending content step - saves items to pending_content table for later enrichment
 * Use this instead of SaveToBookmarkStep when content needs enrichment before becoming bookmarks
 */
export class SaveToPendingContentStep extends BaseWorkflowStep {
    readonly name = 'saveToPendingContent';

    constructor(
        config: StepFactoryConfig,
        private readonly pendingContentRepository: IPendingContentRepository,
        private readonly getExternalId?: (item: BaseContent) => string | undefined
    ) {
        super(config);
    }

    protected async doExecute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        const userId = this.requireUserId();

        this.logger.info(`Saving ${context.items.length} items to pending_content...`);

        try {
            // Pre-filter by URL to avoid unique constraint violations
            const urls = context.items.map((item) => item.url);
            const existingUrls = await this.pendingContentRepository.existsByUrls(userId, urls);

            const pendingItems = [];
            let skippedByUrl = 0;
            let skippedByExternalId = 0;

            for (const item of context.items) {
                // Skip if URL already exists
                if (existingUrls.has(item.url)) {
                    this.logger.info(`Skipping duplicate URL: ${item.url}`);
                    skippedByUrl++;
                    continue;
                }

                const externalId = this.getExternalId?.(item);

                // Check for duplicates if we have an external ID
                if (externalId) {
                    const exists = await this.pendingContentRepository.existsByExternalId(
                        userId,
                        item.sourceAdapter,
                        externalId
                    );
                    if (exists) {
                        this.logger.info(`Skipping duplicate externalId: ${externalId}`);
                        skippedByExternalId++;
                        continue;
                    }
                }

                pendingItems.push(toPendingContent(item, userId, externalId));
            }

            if (pendingItems.length > 0) {
                await this.pendingContentRepository.saveMany(pendingItems);
                this.logger.info(`Saved ${pendingItems.length} items to pending_content`);
            }

            if (skippedByUrl > 0 || skippedByExternalId > 0) {
                this.logger.info(
                    `Skipped ${skippedByUrl + skippedByExternalId} duplicates (${skippedByUrl} by URL, ${skippedByExternalId} by externalId)`
                );
            }

            if (pendingItems.length === 0 && context.items.length > 0) {
                this.logger.info('No new items to save (all duplicates)');
            }

            await this.reportProgress(context, context.items);
        } catch (error) {
            this.logger.error(`Failed to save to pending_content: ${error}`);
            // Continue workflow despite save failure
        }

        return {
            context,
            continue: true,
            message: `Saved ${context.items.length} items to pending_content`,
        };
    }
}

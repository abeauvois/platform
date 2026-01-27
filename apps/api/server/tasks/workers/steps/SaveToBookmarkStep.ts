import {
    type WorkflowContext,
    type StepResult,
    BaseContent,
} from '@abeauvois/platform-domain';
import type { StepFactoryConfig } from '../presets';
import type { ILinkRepository } from './ports';
import { BaseWorkflowStep } from './BaseWorkflowStep';
import { toBookmark } from './utils';

/**
 * Save to database step - saves items as bookmarks
 */
export class SaveToBookmarkStep extends BaseWorkflowStep {
    readonly name = 'saveToDatabase';

    constructor(
        config: StepFactoryConfig,
        private readonly bookmarkRepository?: ILinkRepository
    ) {
        super(config);
    }

    protected async doExecute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        this.logger.info(`Saving ${context.items.length} items to database...`);

        if (!this.bookmarkRepository) {
            this.logger.warning('No bookmark repository configured, skipping database save');
            return { context, continue: true, message: 'No repository configured' };
        }

        const userId = this.requireUserId();

        try {
            // Pre-filter by URL to avoid duplicates
            const urls = context.items.map((item) => item.url);
            const existingUrls = await this.bookmarkRepository.existsByUrls(userId, urls);

            const itemsToSave = context.items.filter((item) => !existingUrls.has(item.url));
            const skippedCount = context.items.length - itemsToSave.length;

            if (skippedCount > 0) {
                this.logger.info(`Skipping ${skippedCount} duplicate URLs`);
            }

            if (itemsToSave.length > 0) {
                const bookmarks = itemsToSave.map((item) => toBookmark(item, userId));
                await this.bookmarkRepository.saveMany(bookmarks);
                this.logger.info(`Saved ${bookmarks.length} bookmarks to database`);
            } else if (context.items.length > 0) {
                this.logger.info('No new bookmarks to save (all duplicates)');
            }

            await this.reportProgress(context, context.items);
        } catch (error) {
            this.logger.error(`Failed to save to database: ${error}`);
            // Continue workflow despite save failure
        }

        return {
            context,
            continue: true,
            message: `Saved ${context.items.length} items to database`,
        };
    }
}

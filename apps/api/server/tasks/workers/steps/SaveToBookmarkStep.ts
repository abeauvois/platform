import {
    type IWorkflowStep,
    type WorkflowContext,
    type StepResult,
    type ILogger,
    BaseContent,
    Bookmark,
} from '@platform/platform-domain';
import type { ILinkRepository } from './ports';

/**
 * Save to database step - saves items as bookmarks
 */
export class SaveToBookmarkStep implements IWorkflowStep<BaseContent> {
    readonly name = 'saveToDatabase';

    constructor(
        private readonly userId: string,
        private readonly logger: ILogger,
        private readonly bookmarkRepository?: ILinkRepository
    ) { }

    async execute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        if (context.items.length === 0) {
            return { context, continue: true, message: 'No items to save' };
        }

        this.logger.info(`Saving ${context.items.length} items to database...`);

        if (!this.bookmarkRepository) {
            this.logger.warning('No bookmark repository configured, skipping database save');
            return { context, continue: true, message: 'No repository configured' };
        }

        try {
            // Convert BaseContent to Bookmark
            const bookmarks = context.items.map(item => new Bookmark(
                item.url,
                this.userId,
                item.sourceAdapter,
                item.tags,
                item.summary,
                item.rawContent,
                item.createdAt,
                item.updatedAt,
                item.contentType
            ));

            // Save to database
            await this.bookmarkRepository.saveMany(bookmarks);
            this.logger.info(`Saved ${bookmarks.length} bookmarks to database`);

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

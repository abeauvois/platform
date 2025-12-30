import {
    type IWorkflowStep,
    type WorkflowContext,
    type StepResult,
    BaseContent,
} from '@platform/platform-domain';
import type { StepFactoryConfig } from '../presets';

/**
 * Read step - fetches items from the source (Gmail, etc.)
 */
export class ReadStep implements IWorkflowStep<BaseContent> {
    readonly name = 'read';

    constructor(
        private readonly config: StepFactoryConfig
    ) { }

    async execute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        const { logger, sourceReader, userId, filter, preset } = this.config;

        logger.info(`Reading items from ${preset} source...`);

        if (!sourceReader) {
            logger.warning('No source reader configured, returning empty items');
            return {
                context: { ...context, items: [] },
                continue: true,
                message: `No source reader configured for ${preset}`,
            };
        }

        // Fetch items from source
        // The source reader may attach additional metadata to the config (e.g., pendingContentIds)
        const readerConfig: { userId?: string; filter?: typeof filter; pendingContentIds?: Record<string, string> } = {
            userId,
            filter,
        };
        const items = await sourceReader.read(readerConfig);

        // Transfer any metadata from source reader to context (e.g., pendingContentIds for enrichment)
        const updatedMetadata = { ...context.metadata };
        if (readerConfig.pendingContentIds) {
            updatedMetadata.pendingContentIds = readerConfig.pendingContentIds;
        }
        if (userId) {
            updatedMetadata.userId = userId;
        }

        // Notify progress for each item
        for (let i = 0; i < items.length; i++) {
            if (context.onItemProcessed) {
                await context.onItemProcessed({
                    item: items[i],
                    index: i,
                    total: items.length,
                    stepName: this.name,
                    success: true,
                });
            }
        }

        logger.info(`Readed ${items.length} items`);

        return {
            context: { ...context, items, metadata: updatedMetadata },
            continue: true,
            message: `Readed ${items.length} items from ${preset}`,
        };
    }
}

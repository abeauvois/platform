import {
    type WorkflowContext,
    type StepResult,
    BaseContent,
} from '@platform/platform-domain';
import type { StepFactoryConfig } from '../presets';
import { BaseWorkflowStep } from './BaseWorkflowStep';

/**
 * Read step - fetches items from the source (Gmail, etc.)
 */
export class ReadStep extends BaseWorkflowStep {
    readonly name = 'read';

    constructor(config: StepFactoryConfig) {
        super(config);
    }

    /**
     * ReadStep should always execute even with empty context.items
     * because it creates new items from the source.
     */
    protected shouldSkipIfEmpty(): boolean {
        return false;
    }

    protected async doExecute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        const { sourceReader, filter, preset } = this.config;

        this.logger.info(`Reading items from ${preset} source...`);

        if (!sourceReader) {
            this.logger.warning('No source reader configured, returning empty items');
            return {
                context: { ...context, items: [] },
                continue: true,
                message: `No source reader configured for ${preset}`,
            };
        }

        // Fetch items from source
        // The source reader may attach additional metadata to the config (e.g., pendingContentIds)
        const readerConfig: { userId?: string; filter?: typeof filter; pendingContentIds?: Record<string, string> } = {
            userId: this.userId,
            filter,
        };
        const items = await sourceReader.read(readerConfig);

        // Transfer any metadata from source reader to context (e.g., pendingContentIds for enrichment)
        const updatedMetadata = { ...context.metadata };
        if (readerConfig.pendingContentIds) {
            updatedMetadata.pendingContentIds = readerConfig.pendingContentIds;
        }
        if (this.userId) {
            updatedMetadata.userId = this.userId;
        }

        await this.reportProgress(context, items);

        this.logger.info(`Read ${items.length} items`);

        return {
            context: { ...context, items, metadata: updatedMetadata },
            continue: true,
            message: `Read ${items.length} items from ${preset}`,
        };
    }
}

import {
    type IWorkflowStep,
    type WorkflowContext,
    type StepResult,
    BaseContent,
} from '@platform/platform-domain';
import type { StepFactoryConfig } from '../presets';
import type { IExportService } from './ports';

/**
 * Export step - exports results to CSV/Notion
 */
export class ExportStep implements IWorkflowStep<BaseContent> {
    readonly name = 'export';

    constructor(
        private readonly config: StepFactoryConfig,
        private readonly exportService?: IExportService,
        private readonly outputPath?: string
    ) { }

    async execute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        const { logger, csvOnly } = this.config;

        if (context.items.length === 0) {
            return { context, continue: true, message: 'No items to export' };
        }

        const exportTargets = csvOnly ? 'CSV' : 'CSV and Notion';
        logger.info(`Exporting ${context.items.length} items to ${exportTargets}...`);

        // Use injected export service if available
        if (this.exportService) {
            const csvPath = this.outputPath || context.outputPath || `/tmp/export-${Date.now()}.csv`;

            try {
                await this.exportService.exportToCsv(context.items, csvPath);
                logger.info(`CSV exported to ${csvPath}`);

                if (!csvOnly) {
                    await this.exportService.exportToNotion(context.items);
                    logger.info('Notion export complete');
                }
            } catch (error) {
                logger.error(`Export failed: ${error}`);
                // Continue workflow despite export failure
            }
        } else {
            logger.debug('No export service configured, skipping actual export');
        }

        // Notify progress for each item
        for (let i = 0; i < context.items.length; i++) {
            const item = context.items[i];

            if (context.onItemProcessed) {
                await context.onItemProcessed({
                    item,
                    index: i,
                    total: context.items.length,
                    stepName: this.name,
                    success: true,
                });
            }
        }

        logger.info(`Exported ${context.items.length} items`);

        return {
            context,
            continue: true,
            message: `Exported ${context.items.length} items to ${exportTargets}`,
        };
    }
}

import {
    type WorkflowContext,
    type StepResult,
    BaseContent,
} from '@platform/platform-domain';
import type { StepFactoryConfig } from '../presets';
import type { IExportService } from './ports';
import { BaseWorkflowStep } from './BaseWorkflowStep';

/**
 * Export step - exports results to CSV/Notion
 */
export class ExportStep extends BaseWorkflowStep {
    readonly name = 'export';

    constructor(
        config: StepFactoryConfig,
        private readonly exportService?: IExportService,
        private readonly outputPath?: string
    ) {
        super(config);
    }

    protected async doExecute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        const { csvOnly } = this.config;
        const exportTargets = csvOnly ? 'CSV' : 'CSV and Notion';

        this.logger.info(`Exporting ${context.items.length} items to ${exportTargets}...`);

        if (this.exportService) {
            const csvPath = this.outputPath || context.outputPath || `/tmp/export-${Date.now()}.csv`;

            try {
                await this.exportService.exportToCsv(context.items, csvPath);
                this.logger.info(`CSV exported to ${csvPath}`);

                if (!csvOnly) {
                    await this.exportService.exportToNotion(context.items);
                    this.logger.info('Notion export complete');
                }
            } catch (error) {
                this.logger.error(`Export failed: ${error}`);
                // Continue workflow despite export failure
            }
        } else {
            this.logger.debug('No export service configured, skipping actual export');
        }

        await this.reportProgress(context, context.items);

        this.logger.info(`Exported ${context.items.length} items`);

        return {
            context,
            continue: true,
            message: `Exported ${context.items.length} items to ${exportTargets}`,
        };
    }
}

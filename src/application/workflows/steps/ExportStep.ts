import { Bookmark } from '../../../domain/entities/Bookmark';
import { ILogger } from '../../../domain/ports/ILogger';
import { ExportService } from '../../services/ExportService';
import { IWorkflowStep, StepResult, WorkflowContext } from '../IWorkflowStep';

export interface ExportStepOptions {
    /** Export to CSV file */
    csv?: boolean;
    /** Export to Notion database */
    notion?: boolean;
}

/**
 * Workflow step that exports bookmarks to CSV and/or Notion
 */
export class ExportStep implements IWorkflowStep<Bookmark> {
    readonly name = 'export';

    constructor(
        private readonly exportService: ExportService,
        private readonly logger: ILogger,
        private readonly options: ExportStepOptions = { csv: true, notion: true }
    ) {}

    async execute(context: WorkflowContext<Bookmark>): Promise<StepResult<Bookmark>> {
        if (context.items.length === 0) {
            return {
                context,
                continue: true,
                message: 'No bookmarks to export',
            };
        }

        if (!context.outputPath && this.options.csv) {
            return {
                context,
                continue: false,
                message: 'No output path provided',
            };
        }

        this.logger.info('\n📤 Starting export step...');

        await this.exportService.exportResults(
            context.items,
            context.outputPath!,
            context.updatedIds.size > 0 ? context.updatedIds : undefined
        );

        return {
            context,
            continue: true,
            message: `Exported ${context.items.length} bookmarks`,
        };
    }
}

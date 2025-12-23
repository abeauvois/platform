import { Bookmark } from '../../../domain/entities/Bookmark';
import { ILogger } from '../../../domain/ports/ILogger';
import { ZipEmlFilesBookmarksWorkflowService } from '../../services/ZipEmlFilesBookmarksWorkflowService';
import { IWorkflowStep, StepResult, WorkflowContext } from '../IWorkflowStep';

/**
 * Workflow step that extracts bookmarks from email files
 */
export class ExtractionStep implements IWorkflowStep<Bookmark> {
    readonly name = 'extraction';

    constructor(
        private readonly extractionService: ZipEmlFilesBookmarksWorkflowService,
        private readonly logger: ILogger
    ) {}

    async execute(context: WorkflowContext<Bookmark>): Promise<StepResult<Bookmark>> {
        if (!context.sourcePath) {
            return {
                context,
                continue: false,
                message: 'No source path provided for extraction',
            };
        }

        this.logger.info('📦 Starting extraction step...');
        const bookmarks = await this.extractionService.extractAndParseEmails(context.sourcePath);

        return {
            context: {
                ...context,
                items: bookmarks,
            },
            continue: bookmarks.length > 0,
            message: `Extracted ${bookmarks.length} bookmarks`,
        };
    }
}

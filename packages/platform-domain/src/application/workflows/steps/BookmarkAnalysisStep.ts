import { truncateText } from '@platform/utils';
import { Bookmark } from '../../../domain/entities/Bookmark';
import { IContentAnalyser } from '../../../domain/ports/IContentAnalyser';
import { ILogger } from '../../../domain/ports/ILogger';
import { ExtractLinksConfig } from '../../config/ExtractLinksConfig';
import { IWorkflowStep, StepResult, WorkflowContext } from '../IWorkflowStep';

/**
 * Workflow step that analyzes bookmarks with AI (without Twitter enrichment)
 */
export class BookmarkAnalysisStep implements IWorkflowStep<Bookmark> {
    readonly name = 'analysis';

    constructor(
        private readonly linkAnalyzer: IContentAnalyser,
        private readonly logger: ILogger
    ) { }

    async execute(context: WorkflowContext<Bookmark>): Promise<StepResult<Bookmark>> {
        if (context.items.length === 0) {
            return {
                context,
                continue: true,
                message: 'No bookmarks to analyze',
            };
        }

        this.logger.info('\n🤖 Analyzing links with AI...');
        const analyzedBookmarks: Bookmark[] = [];

        for (let i = 0; i < context.items.length; i++) {
            const bookmark = context.items[i];
            const truncatedUrl = truncateText(bookmark.url, ExtractLinksConfig.LINK.MAX_LOG_LENGTH);
            this.logger.info(`  [${i + 1}/${context.items.length}] Analyzing: ${truncatedUrl}`);

            try {
                const analysis = await this.linkAnalyzer.analyze(bookmark.url);
                const categorized = bookmark.withCategorization(analysis.tags, analysis.summary);
                analyzedBookmarks.push(categorized);
                this.logger.info(`    ✓ Tags: ${analysis.tags.join(', ')}`);
            } catch (error) {
                this.logger.error(`    ✗ Error analyzing link: ${error}`);
                analyzedBookmarks.push(bookmark);
            }
        }

        return {
            context: {
                ...context,
                items: analyzedBookmarks,
            },
            continue: true,
            message: `Analyzed ${analyzedBookmarks.length} bookmarks`,
        };
    }

}

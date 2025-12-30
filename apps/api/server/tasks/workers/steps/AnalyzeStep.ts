import {
    type IWorkflowStep,
    type WorkflowContext,
    type StepResult,
    BaseContent,
} from '@platform/platform-domain';
import type { StepFactoryConfig } from '../presets';
import type { IContentAnalyser } from './ports';

/**
 * Analysis step - analyzes content with AI
 */
export class AnalyzeStep implements IWorkflowStep<BaseContent> {
    readonly name = 'analyze';

    constructor(
        private readonly config: StepFactoryConfig,
        private readonly contentAnalyser?: IContentAnalyser
    ) { }

    async execute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        const { logger } = this.config;

        if (context.items.length === 0) {
            return { context, continue: true, message: 'No items to analyze' };
        }

        logger.info(`Analyzing ${context.items.length} items with AI...`);

        const analyzedItems: BaseContent[] = [];

        for (let i = 0; i < context.items.length; i++) {
            const item = context.items[i];

            try {
                // Analyze the URL using injected analyzer or fallback
                const analysis = await this.analyzeUrl(item.url);
                const analyzed = item.withCategorization(analysis.tags, analysis.summary);
                analyzedItems.push(analyzed);

                // Notify progress
                if (context.onItemProcessed) {
                    await context.onItemProcessed({
                        item: analyzed,
                        index: i,
                        total: context.items.length,
                        stepName: this.name,
                        success: true,
                    });
                }
            } catch (error) {
                logger.error(`Failed to analyze ${item.url}: ${error}`);
                analyzedItems.push(item); // Keep original on error
            }
        }

        logger.info(`Analyzed ${analyzedItems.length} items`);

        return {
            context: { ...context, items: analyzedItems },
            continue: true,
            message: `Analyzed ${analyzedItems.length} items`,
        };
    }

    private async analyzeUrl(url: string): Promise<{ tags: string[]; summary: string }> {
        // Use injected content analyser if available
        if (this.contentAnalyser) {
            return this.contentAnalyser.analyze(url);
        }

        // Fallback: URL-based heuristic tagging for development/testing
        this.config.logger.debug(`No content analyser configured, using URL-based heuristics \nfor ${url}`);
        const tags: string[] = [];
        const lowerUrl = url.toLowerCase();

        if (lowerUrl.includes('github')) tags.push('code', 'opensource');
        else if (lowerUrl.includes('twitter') || lowerUrl.includes('x.com')) tags.push('social', 'twitter');
        else if (lowerUrl.includes('news') || lowerUrl.includes('hn') || lowerUrl.includes('ycombinator')) tags.push('news', 'tech');
        else tags.push('article');

        return {
            tags,
            summary: `Content from ${new URL(url).hostname}`,
        };
    }
}

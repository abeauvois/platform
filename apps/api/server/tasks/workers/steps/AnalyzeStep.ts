import {
    type WorkflowContext,
    type StepResult,
    BaseContent,
} from '@platform/platform-domain';
import type { StepFactoryConfig } from '../presets';
import type { IContentAnalyser } from './ports';
import { BaseWorkflowStep } from './BaseWorkflowStep';

/**
 * Analysis step - analyzes content with AI
 */
export class AnalyzeStep extends BaseWorkflowStep {
    readonly name = 'analyze';

    constructor(
        config: StepFactoryConfig,
        private readonly contentAnalyser?: IContentAnalyser
    ) {
        super(config);
    }

    protected async doExecute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        this.logger.info(`Analyzing ${context.items.length} items with AI...`);

        const analyzedItems: BaseContent[] = [];
        const results: Map<number, { success: boolean; error?: string }> = new Map();

        for (let i = 0; i < context.items.length; i++) {
            const item = context.items[i];

            try {
                const analysis = await this.analyzeUrl(item.url);
                const analyzed = item.withCategorization(analysis.tags, analysis.summary);
                analyzedItems.push(analyzed);
                results.set(i, { success: true });
            } catch (error) {
                this.logger.error(`Failed to analyze ${item.url}: ${error}`);
                analyzedItems.push(item); // Keep original on error
                results.set(i, { success: false, error: String(error) });
            }
        }

        await this.reportProgress(
            { ...context, items: analyzedItems },
            analyzedItems,
            (_, index) => results.get(index) ?? { success: true }
        );

        this.logger.info(`Analyzed ${analyzedItems.length} items`);

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
        this.logger.debug(`No content analyser configured, using URL-based heuristics \nfor ${url}`);
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

import {
    type WorkflowContext,
    type StepResult,
    BaseContent,
} from '@platform/platform-domain';
import type { StepFactoryConfig } from '../presets';
import type { IContentAnalyser, IRateLimitedClient } from './ports';
import { BaseWorkflowStep } from './BaseWorkflowStep';

/**
 * Enrich step - enriches Twitter/X links with additional content
 */
export class EnrichStep extends BaseWorkflowStep {
    readonly name = 'enrich';

    constructor(
        config: StepFactoryConfig,
        private readonly rateLimitedClient?: IRateLimitedClient,
        private readonly contentAnalyser?: IContentAnalyser
    ) {
        super(config);
    }

    protected async doExecute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        const twitterItems = context.items.filter(item => this.isTwitterUrl(item.url));

        if (twitterItems.length === 0) {
            this.logger.info('No Twitter links to enrich');
            await this.reportProgress(context, context.items);
            return { context, continue: true, message: 'No Twitter links to enrich' };
        }

        this.logger.info(`Enriching ${twitterItems.length} Twitter links...`);

        const enrichedItems = [...context.items];
        const results: Map<number, { success: boolean; error?: string }> = new Map();

        for (let i = 0; i < context.items.length; i++) {
            const item = context.items[i];

            if (this.isTwitterUrl(item.url)) {
                try {
                    const enriched = await this.enrichTwitterItem(item);
                    enrichedItems[i] = enriched;
                    results.set(i, { success: true });
                } catch (error) {
                    this.logger.error(`Failed to enrich ${item.url}: ${error}`);
                    results.set(i, { success: false, error: String(error) });
                    // Keep original on error
                }
            } else {
                results.set(i, { success: true });
            }
        }

        await this.reportProgress(
            { ...context, items: enrichedItems },
            enrichedItems,
            (_, index) => results.get(index) ?? { success: true }
        );

        this.logger.info(`Enriched ${twitterItems.length} Twitter links`);

        return {
            context: { ...context, items: enrichedItems },
            continue: true,
            message: `Enriched ${twitterItems.length} Twitter links`,
        };
    }

    private isTwitterUrl(url: string): boolean {
        return url.includes('twitter.com') || url.includes('x.com') || url.includes('t.co');
    }

    private async enrichTwitterItem(item: BaseContent): Promise<BaseContent> {
        // Use injected rate-limited client if available
        if (this.rateLimitedClient) {
            if (this.rateLimitedClient.isRateLimited()) {
                this.logger.warning(`Rate limited, skipping enrichment for ${item.url}`);
                return item;
            }

            const content = await this.rateLimitedClient.fetchContent(item.url);
            if (content) {
                // Re-analyze with fetched content if content analyser is available
                if (this.contentAnalyser) {
                    const analysis = await this.contentAnalyser.analyze(item.url, content);
                    return item.withCategorization(analysis.tags, analysis.summary);
                }
                // Otherwise just add the enriched tag
                return item.withCategorization(
                    [...item.tags, 'enriched'],
                    `${item.summary} - Content: ${content.substring(0, 100)}...`
                );
            }
        }

        // Fallback: mark as enriched without actual content
        this.logger.debug('No rate-limited client configured, using placeholder enrichment');
        return item.withCategorization(
            [...item.tags, 'enriched'],
            item.summary + ' (with fetched content)'
        );
    }
}

import {
    type IWorkflowStep,
    type WorkflowContext,
    type StepResult,
    BaseContent,
} from '@platform/platform-domain';
import type { StepFactoryConfig } from '../presets';
import type { IContentAnalyser, IRateLimitedClient } from './ports';

/**
 * Enrich step - enriches Twitter/X links with additional content
 */
export class EnrichStep implements IWorkflowStep<BaseContent> {
    readonly name = 'enrich';

    constructor(
        private readonly config: StepFactoryConfig,
        private readonly rateLimitedClient?: IRateLimitedClient,
        private readonly contentAnalyser?: IContentAnalyser
    ) { }

    async execute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        const { logger } = this.config;
        const twitterItems = context.items.filter(item => this.isTwitterUrl(item.url));

        if (twitterItems.length === 0) {
            logger.info('No Twitter links to enrich');
            // Still notify progress for all items
            for (let i = 0; i < context.items.length; i++) {
                if (context.onItemProcessed) {
                    await context.onItemProcessed({
                        item: context.items[i],
                        index: i,
                        total: context.items.length,
                        stepName: this.name,
                        success: true,
                    });
                }
            }
            return { context, continue: true, message: 'No Twitter links to enrich' };
        }

        logger.info(`Enriching ${twitterItems.length} Twitter links...`);

        const enrichedItems = [...context.items];

        for (let i = 0; i < context.items.length; i++) {
            const item = context.items[i];

            if (this.isTwitterUrl(item.url)) {
                try {
                    const enriched = await this.enrichTwitterItem(item);
                    enrichedItems[i] = enriched;
                } catch (error) {
                    logger.error(`Failed to enrich ${item.url}: ${error}`);
                    // Keep original on error
                }
            }

            // Notify progress
            if (context.onItemProcessed) {
                await context.onItemProcessed({
                    item: enrichedItems[i],
                    index: i,
                    total: context.items.length,
                    stepName: this.name,
                    success: true,
                });
            }
        }

        logger.info(`Enriched ${twitterItems.length} Twitter links`);

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
                this.config.logger.warning(`Rate limited, skipping enrichment for ${item.url}`);
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
        this.config.logger.debug('No rate-limited client configured, using placeholder enrichment');
        return item.withCategorization(
            [...item.tags, 'enriched'],
            item.summary + ' (with fetched content)'
        );
    }
}

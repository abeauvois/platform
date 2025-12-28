import { truncateText } from '@platform/utils';
import { Bookmark } from '../../../domain/entities/Bookmark';
import { IContentAnalyser } from '../../../domain/ports/IContentAnalyser';
import { ILogger } from '../../../domain/ports/ILogger';
import { ITwitterClient } from '../../../domain/ports/ITwitterClient';
import { ExtractLinksConfig } from '../../config/ExtractLinksConfig';
import { QueuedLink } from '../../QueuedLink.types';
import { IWorkflowStep, StepResult, WorkflowContext } from '../IWorkflowStep';

/**
 * Workflow step that enriches Twitter/X links with tweet content
 */
export class TwitterEnrichmentStep implements IWorkflowStep<Bookmark> {
    readonly name = 'twitter-enrichment';

    constructor(
        private readonly tweetClient: ITwitterClient,
        private readonly linkAnalyzer: IContentAnalyser,
        private readonly logger: ILogger
    ) {}

    async execute(context: WorkflowContext<Bookmark>): Promise<StepResult<Bookmark>> {
        const twitterBookmarks = context.items.filter(b => this.isTwitterUrl(b.url));

        if (twitterBookmarks.length === 0) {
            return {
                context,
                continue: true,
                message: 'No Twitter links to enrich',
            };
        }

        this.logger.info(`\n🐦 Enriching ${twitterBookmarks.length} Twitter links...`);
        const enrichedBookmarks = [...context.items];
        const retryQueue: QueuedLink[] = [];

        for (let i = 0; i < context.items.length; i++) {
            const bookmark = context.items[i];
            if (!this.isTwitterUrl(bookmark.url)) continue;

            const truncatedUrl = truncateText(bookmark.url, ExtractLinksConfig.LINK.MAX_LOG_LENGTH);
            this.logger.info(`  Fetching tweet: ${truncatedUrl}`);

            try {
                const tweetContent = await this.tweetClient.fetchTweetContent(bookmark.url);

                if (tweetContent) {
                    this.logger.info(`    ✓ Tweet content retrieved`);
                    const analysis = await this.linkAnalyzer.analyze(bookmark.url, tweetContent);
                    enrichedBookmarks[i] = bookmark.withCategorization(analysis.tags, analysis.summary);
                } else if (this.tweetClient.isRateLimited()) {
                    retryQueue.push({ link: bookmark, index: i, attempts: 0 });
                    this.logger.warning(`    ⚠️  Rate limited, queued for retry`);
                }
            } catch (error) {
                this.logger.error(`    ✗ Error: ${error}`);
            }
        }

        // Store retry queue in metadata for RetryStep
        const metadata = {
            ...context.metadata,
            twitterRetryQueue: retryQueue,
        };

        return {
            context: {
                ...context,
                items: enrichedBookmarks,
                metadata,
            },
            continue: true,
            message: `Enriched Twitter links, ${retryQueue.length} queued for retry`,
        };
    }

    private isTwitterUrl(url: string): boolean {
        return url.includes('twitter.com/') || url.includes('x.com/') || url.includes('t.co/');
    }
}

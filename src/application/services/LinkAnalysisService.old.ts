import { Bookmark } from '../../domain/entities/Bookmark';
import { IContentAnalyser } from '../../domain/ports/IContentAnalyser';
import { ILogger } from '../../domain/ports/ILogger';
import { ITweetClient } from '../../domain/ports/ITweetClient';

import { ExtractLinksConfig } from '../config/ExtractLinksConfig';
import { QueuedLink } from '../QueuedLink.types';

/**
 * Result of analyzing a collection of links
 */
export interface AnalysisResult {
    categorizedLinks: Bookmark[];
    retryQueue: QueuedLink[];
}

/**
 * Service responsible for analyzing links with AI and handling Twitter content enrichment
 */
export class LinkAnalysisService {
    constructor(
        private readonly linkAnalyzer: IContentAnalyser,
        private readonly tweetScraper: ITweetClient,
        private readonly logger: ILogger
    ) { }

    /**
     * Analyze a collection of email links with AI
     * @param links Array of Bookmark objects to analyze
     * @returns Categorized links and retry queue for rate-limited links
     */
    async analyzeLinks(links: Bookmark[]): Promise<AnalysisResult> {
        this.logger.info('\n🤖 Analyzing links with AI...');
        const categorizedLinks: Bookmark[] = [];
        const retryQueue: QueuedLink[] = [];

        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            const truncatedUrl = this.truncateUrl(link.url);
            this.logger.info(`  [${i + 1}/${links.length}] Analyzing: ${truncatedUrl}`);

            try {
                const result = await this.analyzeSingleLink(link);
                categorizedLinks.push(result.categorized);
                this.logger.info(`    ✓ Tag: ${result.categorized.tag}`);

                if (result.shouldRetry) {
                    retryQueue.push({
                        link,
                        index: categorizedLinks.length - 1,
                        attempts: 0
                    });
                }
            } catch (error) {
                this.logger.error(`    ✗ Error analyzing link: ${error}`);
                categorizedLinks.push(link);
            }
        }

        return { categorizedLinks, retryQueue };
    }

    /**
     * Analyze a single link with optional Twitter content enrichment
     */
    private async analyzeSingleLink(link: Bookmark): Promise<{
        categorized: Bookmark;
        shouldRetry: boolean;
    }> {
        const isTwitterUrl = this.isTwitterUrl(link.url);
        let tweetContent: string | null = null;

        if (isTwitterUrl) {
            this.logger.info(`    🐦 Fetching tweet content...`);
            tweetContent = await this.tweetScraper.fetchTweetContent(link.url);
            if (tweetContent) {
                this.logger.info(`    ✓ Tweet content retrieved`);
            }
        }

        const analysis = await this.linkAnalyzer.analyze(link.url, tweetContent || undefined);
        const categorized = link.withCategorization(analysis.tag, analysis.description);

        // Check if this should be queued for retry
        const shouldRetry = isTwitterUrl &&
            analysis.tag === 'Unknown' &&
            !tweetContent &&
            this.tweetScraper.isRateLimited();

        return { categorized, shouldRetry };
    }

    /**
     * Check if URL is a Twitter/X URL
     */
    private isTwitterUrl(url: string): boolean {
        return url.includes('twitter.com/') || url.includes('x.com/') || url.includes('t.co/');
    }

    /**
     * Truncate URL for logging purposes
     */
    private truncateUrl(url: string): string {
        const maxLength = ExtractLinksConfig.LINK.MAX_LOG_LENGTH;
        return url.length > maxLength ? url.slice(0, maxLength - 3) + '...' : url;
    }
}

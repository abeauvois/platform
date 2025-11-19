import { Bookmark } from '../../domain/entities/Bookmark';
import { IContentAnalyser } from '../../domain/ports/IContentAnalyser';
import { ILogger } from '../../domain/ports/ILogger';
import { ITweetScraper } from '../../domain/ports/ITweetScraper';

import { ExtractLinksConfig } from '../config/ExtractLinksConfig';
import { QueuedLink } from '../QueuedLink.types';

/**
 * Result of handling a retry queue
 */
export interface RetryResult {
    updatedUrls: Set<string>;
    remainingQueue: QueuedLink[];
}

/**
 * Service responsible for handling retry logic for rate-limited Twitter links
 * Includes support for re-queuing links that fail with 429 during retry
 */
export class RetryHandlerService {
    constructor(
        private readonly tweetScraper: ITweetScraper,
        private readonly linkAnalyzer: IContentAnalyser,
        private readonly logger: ILogger,
        private readonly maxAttempts: number = ExtractLinksConfig.RATE_LIMIT.MAX_RETRY_ATTEMPTS
    ) { }

    /**
     * Handle a retry queue - wait for rate limit reset and retry all links
     * @param retryQueue Queue of links to retry
     * @param categorizedLinks Array of categorized links (will be updated in place)
     * @returns Set of URLs that were successfully enriched and remaining queue for further retries
     */
    async handleRetryQueue(
        retryQueue: QueuedLink[],
        categorizedLinks: Bookmark[]
    ): Promise<RetryResult> {
        const waitSeconds = this.getRateLimitWaitTime();

        if (waitSeconds > ExtractLinksConfig.RATE_LIMIT.MAX_WAIT_SECONDS) {
            this.logger.warning(`⚠️  Wait time exceeds ${ExtractLinksConfig.RATE_LIMIT.MAX_WAIT_SECONDS / 60} minutes. Skipping retry.`);
            return { updatedUrls: new Set(), remainingQueue: [] };
        }

        this.logger.info(`\n⏳ ${retryQueue.length} Twitter links rate-limited. Reset in ${waitSeconds} seconds`);

        await this.waitForRateLimitReset();
        return await this.retryQueuedLinks(retryQueue, categorizedLinks);
    }

    /**
     * Retry all queued links and separate successful vs failed links
     */
    private async retryQueuedLinks(
        retryQueue: QueuedLink[],
        categorizedLinks: Bookmark[]
    ): Promise<RetryResult> {
        this.logger.info(`🔄 Retrying ${retryQueue.length} rate-limited links...`);
        const updatedUrls = new Set<string>();
        const remainingQueue: QueuedLink[] = [];
        let successCount = 0;

        for (let i = 0; i < retryQueue.length; i++) {
            const queuedLink = retryQueue[i];
            this.logger.info(`  [${i + 1}/${retryQueue.length}] Retrying: ${queuedLink.link.url} (attempt ${queuedLink.attempts + 1}/${this.maxAttempts})`);

            try {
                const result = await this.retryLink(queuedLink);

                if (result.success && result.enriched) {
                    categorizedLinks[queuedLink.index] = result.enriched;
                    updatedUrls.add(queuedLink.link.url);
                    successCount++;
                    this.logger.info(`    ✓ Enriched with tag: ${result.enriched.tag}`);
                } else if (result.shouldRetryAgain && queuedLink.attempts + 1 < this.maxAttempts) {
                    // Re-queue for another retry attempt
                    remainingQueue.push({
                        ...queuedLink,
                        attempts: queuedLink.attempts + 1
                    });
                    this.logger.warning(`    ⚠️  Still rate limited, will retry again (attempt ${queuedLink.attempts + 2}/${this.maxAttempts})`);
                } else if (queuedLink.attempts + 1 >= this.maxAttempts) {
                    this.logger.warning(`    ⚠️  Max retry attempts (${this.maxAttempts}) reached, giving up`);
                } else {
                    this.logger.warning(`    ⚠️  Still unable to fetch tweet content`);
                }
            } catch (error) {
                this.logger.error(`    ✗ Retry failed: ${error}`);
            }
        }

        this.logger.info(`\n✅ Retry complete: ${successCount}/${retryQueue.length} links enriched`);
        if (remainingQueue.length > 0) {
            this.logger.info(`📋 ${remainingQueue.length} links queued for another retry attempt`);
        }

        return { updatedUrls, remainingQueue };
    }

    /**
     * Retry a single link by fetching tweet content and re-analyzing
     */
    private async retryLink(queuedLink: QueuedLink): Promise<{
        success: boolean;
        enriched: Bookmark | null;
        shouldRetryAgain: boolean;
    }> {
        try {
            const tweetContent = await this.tweetScraper.fetchTweetContent(queuedLink.link.url);

            if (!tweetContent) {
                // Check if we hit rate limit again
                const isRateLimited = this.tweetScraper.isRateLimited();
                return {
                    success: false,
                    enriched: null,
                    shouldRetryAgain: isRateLimited
                };
            }

            this.logger.info(`    ✓ Tweet content retrieved`);
            const analysis = await this.linkAnalyzer.analyze(queuedLink.link.url, tweetContent);
            const enriched = queuedLink.link.withCategorization(analysis.tag, analysis.description);

            return { success: true, enriched, shouldRetryAgain: false };
        } catch (error) {
            this.logger.error(`    ✗ Retry error: ${error}`);
            return { success: false, enriched: null, shouldRetryAgain: false };
        }
    }

    /**
     * Get seconds until rate limit reset
     */
    private getRateLimitWaitTime(): number {
        const resetTime = this.tweetScraper.getRateLimitResetTime();
        return Math.ceil((resetTime - Date.now()) / 1000);
    }

    /**
     * Wait for rate limit reset with countdown display
     */
    private async waitForRateLimitReset(): Promise<void> {
        const resetTime = this.tweetScraper.getRateLimitResetTime();
        const endWait = resetTime + ExtractLinksConfig.RATE_LIMIT.BUFFER_MS;
        const totalWaitSeconds = Math.ceil((endWait - Date.now()) / 1000);

        const spinner = this.logger.await(`Waiting for rate limit reset (${totalWaitSeconds}s)...`);
        spinner.start();

        while (Date.now() < endWait) {
            const remaining = Math.ceil((endWait - Date.now()) / 1000);
            if (remaining > 0 && remaining % ExtractLinksConfig.RATE_LIMIT.COUNTDOWN_INTERVAL === 0) {
                spinner.update(`Waiting for rate limit reset (${remaining}s remaining)`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        spinner.stop();

        // Clear the rate limit now that we've waited
        this.tweetScraper.clearRateLimit();

        this.logger.info(`✅ Rate limit reset! Retrying...\n`);
    }
}

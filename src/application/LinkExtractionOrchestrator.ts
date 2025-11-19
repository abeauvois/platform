import { ILogger } from '../domain/ports/ILogger';
import { QueuedLink } from './QueuedLink.types';

import { EmailExtractionWorkflowService } from './services/EmailExtractionWorkflowService';
import { ExportService } from './services/ExportService';
import { LinkAnalysisService } from './services/LinkAnalysisService';
import { RetryHandlerService } from './services/RetryHandlerService';

/**
 * Orchestrator for the link extraction workflow
 * Coordinates all services to extract, analyze, retry, and export email links
 */
export class LinkExtractionOrchestrator {
    constructor(
        private readonly extractionService: EmailExtractionWorkflowService,
        private readonly analysisService: LinkAnalysisService,
        private readonly retryHandler: RetryHandlerService,
        private readonly exportService: ExportService,
        private readonly logger: ILogger
    ) { }

    /**
     * Execute the complete link extraction workflow
     * @param sourcePath Path to emails source (zip file or directory)
     * @param outputCsvPath Path for CSV output
     */
    async execute(
        sourcePath: string,
        outputCsvPath: string
    ): Promise<void> {
        // 1. Extract and parse emails
        const Bookmarks = await this.extractionService.extractAndParseEmails(sourcePath);

        // 2. Analyze links with AI
        const { categorizedLinks, retryQueue } = await this.analysisService.analyzeLinks(Bookmarks);

        // 3. Handle retries with recursive logic for multiple attempts
        let allUpdatedUrls = new Set<string>();
        if (retryQueue.length > 0) {
            allUpdatedUrls = await this.handleRetriesWithMultipleAttempts(retryQueue, categorizedLinks);
        }

        // 4. Export final results
        await this.exportService.exportResults(
            categorizedLinks,
            outputCsvPath,
            allUpdatedUrls
        );

        this.logger.info('\n✅ All done!');
    }

    /**
     * Handle retries recursively - supports multiple retry cycles
     * Updates CSV after each successful retry cycle
     */
    private async handleRetriesWithMultipleAttempts(
        initialQueue: QueuedLink[],
        categorizedLinks: any[],
    ): Promise<Set<string>> {
        let queue = initialQueue;
        const allUpdatedUrls = new Set<string>();
        let cycleCount = 0;

        while (queue.length > 0) {
            cycleCount++;
            this.logger.info(`\n🔄 Retry cycle ${cycleCount}: Processing ${queue.length} link(s)`);

            const { updatedUrls, remainingQueue } = await this.retryHandler.handleRetryQueue(
                queue,
                categorizedLinks
            );

            // Add newly updated URLs to the set
            updatedUrls.forEach(url => allUpdatedUrls.add(url));

            // Update CSV if we had any successes
            if (updatedUrls.size > 0) {
                this.logger.info('\n💾 Updating CSV with enriched results...');
                // Note: CSV writer will be called by caller, this is just for intermediate updates
            }

            // Check if we should continue retrying
            if (remainingQueue.length === 0) {
                this.logger.info(`\n✅ All retries completed successfully!`);
                break;
            }

            if (remainingQueue.length === queue.length) {
                // No progress made in this cycle, stop to prevent infinite loop
                this.logger.warning(`\n⚠️  No progress made in retry cycle ${cycleCount}. Stopping retries.`);
                break;
            }

            // Continue with remaining queue
            queue = remainingQueue;
        }

        return allUpdatedUrls;
    }
}

import { EmailLink } from '../domain/entities/EmailLink';
import { ICsvWriter } from '../domain/ports/ICsvWriter';
import { ILinksExtractor } from '../domain/ports/ILinksExtractor';
import { ILinkAnalyzer } from '../domain/ports/ILinkAnalyzer';
import { ILogger } from '../domain/ports/ILogger';
import { ILinkRepository } from '../domain/ports/ILinkRepository';
import { ITweetScraper } from '../domain/ports/ITweetScraper';
import { IZipExtractor } from '../domain/ports/IZipExtractor';
import { LinkExtractionOrchestrator } from './LinkExtractionOrchestrator';
import { EmailExtractionWorkflowService } from './services/EmailExtractionWorkflowService';
import { ExportService } from './services/ExportService';
import { LinkAnalysisService } from './services/LinkAnalysisService';
import { RetryHandlerService } from './services/RetryHandlerService';

export interface QueuedLink {
    link: EmailLink;
    index: number;
    attempts: number;
}

/**
 * Application Use Case: Orchestrates the email link extraction process
 * Now acts as a facade to the new service-based architecture
 * @deprecated Use LinkExtractionOrchestrator directly for new code
*/

export class ExtractLinksUseCase {
    private readonly orchestrator: LinkExtractionOrchestrator;

    constructor(
        private readonly zipExtractor: IZipExtractor,
        private readonly linksExtractor: ILinksExtractor,
        private readonly linkAnalyzer: ILinkAnalyzer,
        private readonly csvWriter: ICsvWriter,
        private readonly notionRepository: ILinkRepository,
        private readonly tweetScraper: ITweetScraper,
        private readonly logger: ILogger
    ) {
        // Initialize the new service-based architecture
        const extractionService = new EmailExtractionWorkflowService(zipExtractor, linksExtractor, logger);
        const analysisService = new LinkAnalysisService(linkAnalyzer, tweetScraper, logger);
        const retryHandler = new RetryHandlerService(tweetScraper, linkAnalyzer, logger);
        const exportService = new ExportService(csvWriter, notionRepository, logger);

        this.orchestrator = new LinkExtractionOrchestrator(
            extractionService,
            analysisService,
            retryHandler,
            exportService,
            logger
        );
    }

    /**
     * Executes the complete link extraction workflow
     * Now delegates to the new orchestrator for improved architecture
     * @param zipFilePath Path to the input zip file
     * @param outputCsvPath Path for the output CSV file
     * @param notionDatabaseId Notion database ID for export
     */
    async execute(zipFilePath: string, outputCsvPath: string, notionDatabaseId: string): Promise<void> {
        // Delegate to the new orchestrator implementation
        return this.orchestrator.execute(zipFilePath, outputCsvPath);
    }
}

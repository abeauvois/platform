import { Bookmark } from '../../domain/entities/Bookmark.js';
import { IConfigProvider } from '../../domain/ports/IConfigProvider.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { ZipEmlFilesBookmarksWorkflowService } from '../../application/services/ZipEmlFilesBookmarksWorkflowService.js';
import { RetryHandlerService } from '../../application/services/RetryHandlerService.js';
import { ExportService } from '../../application/services/ExportService.js';
import { DirectoryReader } from '../adapters/DirectoryReader.js';
import { UrlAndContextAnthropicAnalyser } from '../adapters/UrlAndContextAnthropicAnalyser.js';
import { CsvFileWriter } from '../adapters/CsvFileWriter.js';
import { NotionLinkRepository } from '../repositories/NotionLinkRepository.js';
import { TwitterClient } from '../adapters/TwitterClient.js';
import {
    LinkExtractionBuilder,
    LinkExtractionDependencies,
    IWorkflow,
    WorkflowPresets,
    WorkflowPresetName,
} from '../../application/workflows/index.js';

/**
 * Factory for creating link extraction workflows with all dependencies wired up.
 *
 * @example
 * ```typescript
 * const factory = new LinkExtractionFactory(config, logger);
 *
 * // Build a custom workflow
 * const workflow = factory.builder()
 *     .extract()
 *     .analyze()
 *     .exportTo({ csv: true })
 *     .build();
 * await workflow.execute(inputPath, outputPath);
 *
 * // Or use a preset
 * const quickWorkflow = factory.createPreset('quick');
 * await quickWorkflow.execute(inputPath, outputPath);
 * ```
 */
export class LinkExtractionFactory {
    private readonly deps: LinkExtractionDependencies;

    constructor(
        private readonly config: IConfigProvider,
        private readonly logger: ILogger
    ) {
        this.deps = this.createDependencies();
    }

    /**
     * Create a LinkExtractionBuilder for composing custom workflows
     */
    builder(): LinkExtractionBuilder {
        return new LinkExtractionBuilder(this.deps);
    }

    /**
     * Create a workflow from a preset
     */
    createPreset(name: WorkflowPresetName): IWorkflow<Bookmark> {
        return WorkflowPresets[name](this.deps);
    }

    /**
     * Create all workflow dependencies
     */
    private createDependencies(): LinkExtractionDependencies {
        const anthropicApiKey = this.config.get('ANTHROPIC_API_KEY');
        const notionToken = this.config.get('NOTION_INTEGRATION_TOKEN');
        const notionDatabaseId = this.config.get('NOTION_DATABASE_ID');
        const twitterBearerToken = this.config.get('TWITTER_BEARER_TOKEN');

        // Infrastructure adapters
        const directoryReader = new DirectoryReader();
        const linkAnalyzer = new UrlAndContextAnthropicAnalyser(anthropicApiKey, this.logger);
        const csvWriter = new CsvFileWriter();
        const notionRepository = new NotionLinkRepository(notionToken, notionDatabaseId);
        const tweetClient = new TwitterClient(twitterBearerToken, this.logger);

        // Application services
        const extractionService = new ZipEmlFilesBookmarksWorkflowService(directoryReader, linkAnalyzer, this.logger);
        const retryHandler = new RetryHandlerService(tweetClient, linkAnalyzer, this.logger);
        const exportService = new ExportService(csvWriter, notionRepository, this.logger);

        return {
            extractionService,
            linkAnalyzer,
            tweetClient,
            retryHandler,
            exportService,
            logger: this.logger,
        };
    }
}

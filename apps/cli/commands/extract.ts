import { ZipExtractor } from '../../../src/infrastructure/adapters/ZipExtractor.js';
import { HttpLinksParser } from '../../../src/infrastructure/adapters/HttpLinksParser.js';
import { UrlAndContextAnthropicAnalyser } from '../../../src/infrastructure/adapters/UrlAndContextAnthropicAnalyser.js';
import { CsvFileWriter } from '../../../src/infrastructure/adapters/CsvFileWriter.js';
import { NotionLinkRepository } from '../../../src/infrastructure/repositories/NotionLinkRepository.js';
import { TwitterClient } from '../../../src/infrastructure/adapters/TwitterClient.js';
import { loadConfig } from '../lib/ConfigLoader';
import { CliuiLogger } from '../../../src/infrastructure/adapters/CliuiLogger.js';
import { ZipEmlFilesBookmarksWorkflowService } from '../../../src/application/services/ZipEmlFilesBookmarksWorkflowService.js';
import { LinkAnalysisService } from '../../../src/application/services/LinkAnalysisService.js';
import { RetryHandlerService } from '../../../src/application/services/RetryHandlerService.js';
import { ExportService } from '../../../src/application/services/ExportService.js';
import { LinkExtractionOrchestrator } from '../../../src/application/LinkExtractionOrchestrator.js';

export async function extractCommand(inputPath?: string, outputCsvPath: string = 'output.csv', verbose: boolean = false) {
    try {
        if (!inputPath) {
            console.error('❌ Error: input-path is required');
            console.error('\nUsage: bun run src/cli/index.ts <input-path> [output-csv]\n');
            process.exit(1);
        }

        console.log('🚀 Email Link Extractor\n');
        console.log(`📥 Input:  ${inputPath}`);
        console.log(`📤 Output: ${outputCsvPath}`);

        if (verbose) {
            console.log(`🔊 Verbose: enabled`);
        }
        console.log();

        // Load configuration from API
        console.log('⚙️  Loading configuration from API...');
        const config = await loadConfig();
        const anthropicApiKey = config.get('ANTHROPIC_API_KEY');
        const notionToken = config.get('NOTION_INTEGRATION_TOKEN');
        const notionDatabaseId = config.get('NOTION_DATABASE_ID');
        const twitterBearerToken = config.get('TWITTER_BEARER_TOKEN');
        console.log('✅ Configuration loaded\n');


        // Initialize adapters (infrastructure layer)
        const logger = new CliuiLogger();
        const zipExtractor = new ZipExtractor();
        const httpLinksParser = new HttpLinksParser();
        const linkAnalyzer = new UrlAndContextAnthropicAnalyser(anthropicApiKey, logger);
        const csvWriter = new CsvFileWriter();
        const notionRepository = new NotionLinkRepository(notionToken, notionDatabaseId);
        const tweetScraper = new TwitterClient(twitterBearerToken, logger);

        // Initialize services (application layer)
        const extractionService = new ZipEmlFilesBookmarksWorkflowService(zipExtractor, httpLinksParser, logger);
        const analysisService = new LinkAnalysisService(linkAnalyzer, tweetScraper, logger);
        const retryHandler = new RetryHandlerService(tweetScraper, linkAnalyzer, logger);
        const exportService = new ExportService(csvWriter, notionRepository, logger);

        // Initialize use case (application layer)
        const useCase = new LinkExtractionOrchestrator(
            extractionService,
            analysisService,
            retryHandler,
            exportService,
            logger
        );

        // Execute the workflow
        await useCase.execute(inputPath, outputCsvPath);

        console.log('\n✨ Success! Your links have been extracted and categorized.\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
        if (verbose && error instanceof Error) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        console.error('\nFor help, run: bun run src/cli/index.ts --help\n');
        process.exit(1);
    }
}

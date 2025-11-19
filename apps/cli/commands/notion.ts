import { command } from 'cleye';
import { ZipExtractor } from '../../../src/infrastructure/adapters/ZipExtractor.js';
import { HttpLinksParser } from '../../../src/infrastructure/adapters/HttpLinksParser.js';
import { UrlAndContextAnthropicAnalyser } from '../../../src/infrastructure/adapters/UrlAndContextAnthropicAnalyser.js';
import { CsvFileWriter } from '../../../src/infrastructure/adapters/CsvFileWriter.js';
import { NotionLinkRepository } from '../../../src/infrastructure/repositories/NotionLinkRepository.js';
import { TwitterScraper } from '../../../src/infrastructure/adapters/TwitterScraper.js';
import { EnvConfig } from '../../../src/infrastructure/config/EnvConfig.js';
import { CliuiLogger } from '../../../src/infrastructure/adapters/CliuiLogger.js';
import { EmailExtractionWorkflowService } from '../../../src/application/services/EmailExtractionWorkflowService.js';
import { LinkAnalysisService } from '../../../src/application/services/LinkAnalysisService.js';
import { RetryHandlerService } from '../../../src/application/services/RetryHandlerService.js';
import { ExportService } from '../../../src/application/services/ExportService.js';
import { LinkExtractionOrchestrator } from '../../../src/application/LinkExtractionOrchestrator.js';

export const notionCommand = command({
    name: 'notion',

    flags: {
        from: {
            type: String,
            description: 'Input path (zip file or folder containing .eml files)',
            alias: 'f',
        },
        to: {
            type: String,
            description: 'Notion database ID to export links to',
            alias: 't',
        },
        verbose: {
            type: Boolean,
            description: 'Enable verbose logging',
            alias: 'v',
            default: false
        }
    },

    help: {
        description: 'Extract and export links from email files to Notion',
    }
}, async (argv) => {
    try {
        const inputPath = argv.flags.from;
        const notionDatabaseId = argv.flags.to;
        const verbose = argv.flags.verbose;

        if (!inputPath) {
            console.error('❌ Error: --from (or -f) is required');
            console.error('\nUsage: bun run src/cli/index.ts notion --from <input-path> --to <database-id>\n');
            process.exit(1);
        }

        if (!notionDatabaseId) {
            console.error('❌ Error: --to (or -t) is required');
            console.error('\nUsage: bun run src/cli/index.ts notion --from <input-path> --to <database-id>\n');
            process.exit(1);
        }

        const outputCsvPath = 'output.csv';

        console.log('🚀 Email Link Extractor - Notion Export\n');
        console.log(`📥 Import from: ${inputPath}`);
        console.log(`📤 Export to Notion DB: ${notionDatabaseId}`);

        if (verbose) {
            console.log(`🔊 Verbose: enabled`);
        }
        console.log();

        // Load configuration from .env
        console.log('⚙️  Loading configuration...');
        const config = new EnvConfig();
        await config.load();
        const anthropicApiKey = config.get('ANTHROPIC_API_KEY');
        const notionToken = config.get('NOTION_INTEGRATION_TOKEN');
        const twitterBearerToken = config.get('TWITTER_BEARER_TOKEN');
        console.log('✅ Configuration loaded\n');

        // zip > email files > extract links > analyze links > export to Notion
        // eml files source -> extractionService -> analysisService -> exportService

        // Initialize adapters (infrastructure layer)
        const logger = new CliuiLogger();
        const zipExtractor = new ZipExtractor();
        const httpLinksParser = new HttpLinksParser();
        const linkAnalyzer = new UrlAndContextAnthropicAnalyser(anthropicApiKey, logger);
        const csvWriter = new CsvFileWriter();
        const notionRepository = new NotionLinkRepository(notionToken, notionDatabaseId);
        const tweetScraper = new TwitterScraper(twitterBearerToken, logger);

        // Initialize services (application layer)
        const extractionService = new EmailExtractionWorkflowService(zipExtractor, httpLinksParser, logger);
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

        console.log('\n✨ Success! Your links have been extracted and exported to Notion.\n');
    } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
        if (argv.flags.verbose && error instanceof Error) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        console.error('\nFor help, run: bun run src/cli/index.ts notion --help\n');
        process.exit(1);
    }
});

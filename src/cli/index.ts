#!/usr/bin/env bun

import { cli } from 'cleye';
import { ZipExtractor } from '../infrastructure/adapters/ZipExtractor.js';
import { EmailLinksExtractor } from '../infrastructure/adapters/EmailLinksExtractor.js';
import { AnthropicAnalyzer } from '../infrastructure/adapters/AnthropicAnalyzer.js';
import { CsvFileWriter } from '../infrastructure/adapters/CsvFileWriter.js';
import { NotionLinkRepository } from '../infrastructure/repositories/NotionLinkRepository.js';
import { TwitterScraper } from '../infrastructure/adapters/TwitterScraper.js';
import { EnvConfig } from '../infrastructure/config/EnvConfig.js';
import { CliuiLogger } from '../infrastructure/adapters/CliuiLogger.js';
import { EmailExtractionService } from '../application/services/EmailExtractionService.js';
import { LinkAnalysisService } from '../application/services/LinkAnalysisService.js';
import { RetryHandlerService } from '../application/services/RetryHandlerService.js';
import { ExportService } from '../application/services/ExportService.js';
import { LinkExtractionOrchestrator } from '../application/LinkExtractionOrchestrator.js';

/**
 * CLI Entry Point: Email Link Extractor
 * Modern CLI powered by Cleye
 */
const argv = cli({
  name: 'email-link-extractor',
  version: '1.0.0',

  parameters: [
    '<input-path>',  // Required positional argument (zip file or folder)
    '[output-csv]'   // Optional positional argument
  ],

  flags: {
    verbose: {
      type: Boolean,
      description: 'Enable verbose logging',
      alias: 'v',
      default: false
    }
  },

  help: {
    description: 'Extract and categorize links from email files',
    usage: 'bun run src/cli/index.ts <input-path> [output-csv]',
    examples: [
      'bun run src/cli/index.ts mylinks.zip',
      'bun run src/cli/index.ts data/fixtures/test_mylinks',
      'bun run src/cli/index.ts mylinks.zip results.csv',
      'bun run src/cli/index.ts mylinks.zip --verbose'
    ],

    render: (nodes, renderers) => {
      const defaultRender = renderers.render(nodes);
      return `${defaultRender}

Environment Variables:
  ANTHROPIC_API_KEY         Your Anthropic API key (required, from .env file)
  NOTION_INTEGRATION_TOKEN  Your Notion integration token (required, from .env file)
  NOTION_DATABASE_ID        Your Notion database ID (required, from .env file)
  TWITTER_BEARER_TOKEN      Your Twitter API v2 bearer token (required for tweet content extraction)

Architecture:
  This tool uses Hexagonal Architecture (Ports & Adapters):
  - Domain layer: Core business logic
  - Application layer: Use cases
  - Infrastructure layer: External adapters (Anthropic, Bun, etc.)
`;
    }
  }
});

async function main() {
  try {
    const inputPath = argv._.inputPath;
    const outputCsvPath = argv._.outputCsv || 'output.csv';
    const verbose = argv.flags.verbose;

    console.log('🚀 Email Link Extractor\n');
    console.log(`📥 Input:  ${inputPath}`);
    console.log(`📤 Output: ${outputCsvPath}`);

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
    const notionDatabaseId = config.get('NOTION_DATABASE_ID');
    const twitterBearerToken = config.get('TWITTER_BEARER_TOKEN');
    console.log('✅ Configuration loaded\n');


    // Initialize adapters (infrastructure layer)
    const logger = new CliuiLogger();
    const zipExtractor = new ZipExtractor();
    const linksExtractor = new EmailLinksExtractor();
    const linkAnalyzer = new AnthropicAnalyzer(anthropicApiKey, logger);
    const csvWriter = new CsvFileWriter();
    const notionRepository = new NotionLinkRepository(notionToken, notionDatabaseId);
    const tweetScraper = new TwitterScraper(twitterBearerToken, logger);

    // Initialize services (application layer)
    const extractionService = new EmailExtractionService(zipExtractor, linksExtractor, logger);
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
    await useCase.execute(inputPath, outputCsvPath, notionDatabaseId);

    console.log('\n✨ Success! Your links have been extracted and categorized.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (argv.flags.verbose && error instanceof Error) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    console.error('\nFor help, run: bun run src/cli/index.ts --help\n');
    process.exit(1);
  }
}

main();

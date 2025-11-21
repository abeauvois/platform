#!/usr/bin/env bun

import { cli } from 'cleye';
import { notionCommand } from './commands/notion.js';

/**
 * CLI Entry Point: Email Link Extractor
 * Unified CLI instance using Cleye's command pattern
 */

cli({
  name: 'email-link-extractor',
  version: '1.0.0',

  parameters: [
    '<input-path>',  // Required input path for default extract
    '[output-csv]'   // Optional output CSV
  ],

  flags: {
    verbose: {
      type: Boolean,
      description: 'Enable verbose logging',
      alias: 'v',
      default: false
    }
  },

  commands: [
    notionCommand
  ],

  help: {
    description: 'Extract and categorize links from email files',
    usage: 'bun run src/cli/index.ts <input-path> [output-csv]',
    examples: [
      '# Extract command (default)',
      'bun run src/cli/index.ts mylinks.zip',
      'bun run src/cli/index.ts data/fixtures/test_mylinks',
      'bun run src/cli/index.ts mylinks.zip results.csv',
      'bun run src/cli/index.ts mylinks.zip --verbose',
      '',
      '# Notion command',
      'bun run src/cli/index.ts notion --from mylinks.zip --to abc123',
      'bun run src/cli/index.ts notion -f mylinks.zip -t abc123',
    ],

    render: (nodes, renderers) => {
      const defaultRender = renderers.render(nodes);
      return `${defaultRender}

Other Commands (not using Cleye):
  gmail                     Fetch recent Gmail messages since last execution
  select [input-csv]        Interactively select and filter links from CSV

Environment Variables:
  GMAIL_CLIENT_ID           Your Gmail OAuth client ID (required for gmail command)
  GMAIL_CLIENT_SECRET       Your Gmail OAuth client secret (required for gmail command)
  GMAIL_REFRESH_TOKEN       Your Gmail OAuth refresh token (required for gmail command)
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
}, async (argv) => {
  // Default extract command handler
  try {
    const inputPath = argv._.inputPath;
    const outputCsvPath = argv._.outputCsv || 'output.csv';
    const verbose = argv.flags.verbose;

    if (!inputPath) {
      console.error('❌ Error: input-path is required');
      console.error('\nUsage: bun run src/cli/index.ts <input-path> [output-csv]\n');
      process.exit(1);
    }

    // Import dependencies dynamically to avoid loading them for other commands
    const { ZipExtractor } = await import('../../src/infrastructure/adapters/ZipExtractor.js');
    const { HttpLinksParser } = await import('../../src/infrastructure/adapters/HttpLinksParser.js');
    const { UrlAndContextAnthropicAnalyser } = await import('../../src/infrastructure/adapters/UrlAndContextAnthropicAnalyser.js');
    const { CsvFileWriter } = await import('../../src/infrastructure/adapters/CsvFileWriter.js');
    const { NotionLinkRepository } = await import('../../src/infrastructure/repositories/NotionLinkRepository.js');
    const { TwitterClient } = await import('../../src/infrastructure/adapters/TwitterClient.js');
    const { EnvConfig } = await import('../../src/infrastructure/config/EnvConfig.js');
    const { CliuiLogger } = await import('../../src/infrastructure/adapters/CliuiLogger.js');
    const { ZipEmlFilesBookmarksWorkflowService } = await import('../../src/application/services/ZipEmlFilesBookmarksWorkflowService.js');
    const { LinkAnalysisService } = await import('../../src/application/services/LinkAnalysisService.js');
    const { RetryHandlerService } = await import('../../src/application/services/RetryHandlerService.js');
    const { ExportService } = await import('../../src/application/services/ExportService.js');
    const { LinkExtractionOrchestrator } = await import('../../src/application/LinkExtractionOrchestrator.js');

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
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (argv.flags.verbose && error instanceof Error) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    console.error('\nFor help, run: bun run src/cli/index.ts --help\n');
    process.exit(1);
  }
});

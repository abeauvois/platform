#!/usr/bin/env bun

import { ExtractLinksUseCase } from '../application/ExtractLinksUseCase.js';
import { BunZipExtractor } from '../infrastructure/adapters/BunZipExtractor.js';
import { EmailLinksExtractor } from '../infrastructure/adapters/EmailLinksExtractor.js';
import { AnthropicAnalyzer } from '../infrastructure/adapters/AnthropicAnalyzer.js';
import { CsvFileWriter } from '../infrastructure/adapters/CsvFileWriter.js';
import { NotionDatabaseWriter } from '../infrastructure/adapters/NotionDatabaseWriter.js';
import { TwitterScraper } from '../infrastructure/adapters/TwitterScraper.js';
import { EnvConfig } from '../infrastructure/config/EnvConfig.js';
import { CliuiLogger } from '../infrastructure/adapters/CliuiLogger.js';

/**
 * CLI Entry Point: Email Link Extractor
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
      console.log(`
Email Link Extractor - Extract and categorize links from email files

Usage:
  bun run src/cli/index.ts <zip-file> [output-csv]

Arguments:
  <zip-file>    Path to the zip file containing .eml files (required)
  [output-csv]  Path for the output CSV file (default: output.csv)

Environment Variables:
  ANTHROPIC_API_KEY         Your Anthropic API key (required, from .env file)
  NOTION_INTEGRATION_TOKEN  Your Notion integration token (required, from .env file)
  NOTION_DATABASE_ID        Your Notion database ID (required, from .env file)
  TWITTER_BEARER_TOKEN      Your Twitter API v2 bearer token (required for tweet content extraction)

Examples:
  bun run src/cli/index.ts mylinks.zip
  bun run src/cli/index.ts mylinks.zip results.csv

Architecture:
  This tool uses Hexagonal Architecture (Ports & Adapters):
  - Domain layer: Core business logic
  - Application layer: Use cases
  - Infrastructure layer: External adapters (Anthropic, Bun, etc.)
            `);
      process.exit(0);
    }

    const zipFilePath = args[0];
    const outputCsvPath = args[1] || 'output.csv';

    console.log('🚀 Email Link Extractor\n');
    console.log(`📥 Input:  ${zipFilePath}`);
    console.log(`📤 Output: ${outputCsvPath}\n`);

    // Load configuration from .env
    console.log('⚙️  Loading configuration...');
    const config = new EnvConfig();
    await config.load();
    const anthropicApiKey = config.get('ANTHROPIC_API_KEY');
    const notionToken = config.get('NOTION_INTEGRATION_TOKEN');
    const notionDatabaseId = config.get('NOTION_DATABASE_ID');
    const twitterBearerToken = config.get('TWITTER_BEARER_TOKEN');
    console.log('✅ Configuration loaded\n');

    // Initialize logger (infrastructure layer)
    const logger = new CliuiLogger();

    // Initialize adapters (infrastructure layer)
    const zipExtractor = new BunZipExtractor();
    const LinksExtractor = new EmailLinksExtractor();
    const linkAnalyzer = new AnthropicAnalyzer(anthropicApiKey, logger);
    const csvWriter = new CsvFileWriter();
    const notionWriter = new NotionDatabaseWriter(notionToken);
    const tweetScraper = new TwitterScraper(twitterBearerToken, logger);

    // Initialize use case (application layer)
    const useCase = new ExtractLinksUseCase(
      zipExtractor,
      LinksExtractor,
      linkAnalyzer,
      csvWriter,
      notionWriter,
      tweetScraper,
      logger
    );

    // Execute the workflow
    await useCase.execute(zipFilePath, outputCsvPath, notionDatabaseId);

    console.log('\n✨ Success! Your links have been extracted and categorized.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('\nFor help, run: bun run src/cli/index.ts --help\n');
    process.exit(1);
  }
}

main();

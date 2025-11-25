#!/usr/bin/env bun

import { cli } from 'cleye';
import { notionCommand } from './commands/notion.js';
import { personalCommand } from './commands/personal.js';

console.log('🔍 DEBUG: Script is executing');

/**
 * CLI Entry Point: Email Link Extractor
 * Unified CLI instance using Cleye's command pattern
 */

cli({
  name: 'platform-cli',
  version: '0.0.2',

  parameters: [
    '[input-path]',  // Optional input path for default extract
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
    notionCommand,
    personalCommand
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
})

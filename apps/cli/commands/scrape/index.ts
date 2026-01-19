import { command } from 'cleye';
import * as p from '@clack/prompts';
import { ChromeCdpAdapter, LeboncoinStrategy, type ScrapedListing } from '@platform/browser-scraper';
import { createCliContext } from '../../lib/cli-context.js';

/**
 * Scrape command - Scrape data from protected websites
 *
 * Usage:
 *   cli scrape leboncoin --url "https://www.leboncoin.fr/recherche?category=71"
 */
export const scrapeCommand = command(
  {
    name: 'scrape',
    parameters: ['<source>'],
    flags: {
      url: {
        type: String,
        description: 'URL to scrape',
        alias: 'u',
      },
      cdpEndpoint: {
        type: String,
        description: 'Chrome CDP endpoint',
        default: 'http://localhost:9222',
      },
      save: {
        type: Boolean,
        description: 'Save results to database',
        default: false,
      },
      json: {
        type: Boolean,
        description: 'Output as JSON',
        default: false,
      },
    },
    help: {
      description: 'Scrape data from protected websites using Chrome CDP',
      examples: [
        'scrape leboncoin --url "https://www.leboncoin.fr/recherche?category=71"',
        'scrape leboncoin -u "https://..." --json',
        'scrape leboncoin -u "https://..." --save',
      ],
    },
  },
  async (argv) => {
    const source = argv._.source;
    const { url, cdpEndpoint, save, json } = argv.flags;

    if (!json) {
      p.intro('🔍 Browser Scraper');
    }

    // Validate source
    if (source !== 'leboncoin') {
      if (!json) {
        p.log.error(`Unknown source: ${source}. Supported: leboncoin`);
        p.outro('❌ Scrape failed');
      } else {
        console.log(JSON.stringify({ error: `Unknown source: ${source}` }));
      }
      process.exit(1);
    }

    // Get URL if not provided
    let targetUrl = url;
    if (!targetUrl && !json) {
      const inputUrl = await p.text({
        message: 'Enter the URL to scrape',
        placeholder: 'https://www.leboncoin.fr/recherche?category=71',
        validate: (value) => {
          if (!value) return 'URL is required';
          try {
            new URL(value);
          } catch {
            return 'Invalid URL';
          }
        },
      });

      if (p.isCancel(inputUrl)) {
        p.cancel('Operation cancelled.');
        process.exit(0);
      }
      targetUrl = inputUrl as string;
    }

    if (!targetUrl) {
      if (!json) {
        p.log.error('URL is required');
        p.outro('❌ Scrape failed');
      } else {
        console.log(JSON.stringify({ error: 'URL is required' }));
      }
      process.exit(1);
    }

    // Pre-authenticate if --save is requested (before scraping to avoid losing data)
    let ctx: Awaited<ReturnType<typeof createCliContext>> | undefined;
    if (save) {
      try {
        ctx = await createCliContext({ skipConfig: true });
      } catch (authError) {
        if (!json) {
          p.log.error('Authentication required to save data');
          p.outro('❌ Please sign in first');
        } else {
          console.log(JSON.stringify({ error: 'Authentication required' }));
        }
        process.exit(1);
      }
    }

    const adapter = new ChromeCdpAdapter({ cdpEndpoint });

    try {
      if (!json) {
        const spinner = p.spinner();
        spinner.start(`Connecting to Chrome at ${cdpEndpoint}`);
        await adapter.connect();
        spinner.stop('Connected to Chrome');

        spinner.start(`Scraping ${targetUrl}`);
        const strategy = new LeboncoinStrategy();
        const results = await adapter.scrape<Array<ScrapedListing>>(targetUrl, strategy);
        spinner.stop(`Found ${results.length} listings`);

        // Save to database if requested (ctx is pre-authenticated)
        if (save && ctx) {
          spinner.start('Saving to database...');
          try {
            const { id } = await ctx.apiClient.scraper.save({
              source,
              sourceUrl: targetUrl,
              strategyName: 'listings',
              data: results,
              itemCount: results.length,
            });
            spinner.stop(`Saved to database (id: ${id})`);
          } catch (saveError) {
            spinner.stop('Failed to save to database');
            p.log.error(saveError instanceof Error ? saveError.message : 'Save failed');
          }
        }

        // Display results
        if (results.length > 0) {
          p.note(
            results.slice(0, 10).map((listing, i) =>
              `${i + 1}. ${listing.title}\n   💰 ${listing.price} | 📍 ${listing.location}\n   🔗 ${listing.url}`
            ).join('\n\n'),
            `Results (showing ${Math.min(10, results.length)} of ${results.length})`
          );
        } else {
          p.log.warn('No listings found');
        }

        p.outro('✨ Scrape complete!');
      } else {
        // JSON output mode
        await adapter.connect();
        const strategy = new LeboncoinStrategy();
        const results = await adapter.scrape<Array<ScrapedListing>>(targetUrl, strategy);

        // Save to database if requested (ctx is pre-authenticated)
        let savedId: string | undefined;
        if (save && ctx) {
          try {
            const { id } = await ctx.apiClient.scraper.save({
              source,
              sourceUrl: targetUrl,
              strategyName: 'listings',
              data: results,
              itemCount: results.length,
            });
            savedId = id;
          } catch (saveError) {
            console.log(JSON.stringify({
              error: saveError instanceof Error ? saveError.message : 'Save failed'
            }));
            process.exit(1);
          }
        }

        console.log(JSON.stringify({
          success: true,
          data: results,
          count: results.length,
          ...(savedId && { savedId }),
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (!json) {
        p.log.error(`Scrape failed: ${message}`);
        p.outro('❌ Scrape failed');
      } else {
        console.log(JSON.stringify({ error: message }));
      }
      process.exit(1);
    } finally {
      await adapter.disconnect();
    }
  }
);

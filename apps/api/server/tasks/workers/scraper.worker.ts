import type { PgBoss, Job } from '@platform/task';
import { QUEUE_NAMES } from '../types';
import { ChromeCdpAdapter, LeboncoinStrategy, type ScrapedListing } from '@platform/browser-scraper';
import { db } from '@platform/db';
import { scrapedData } from '@platform/db/schema';

/**
 * Payload for scraper jobs
 */
export interface ScraperJobPayload {
    userId: string;
    source: string;
    url: string;
    strategy: 'listings';
}

/**
 * Create a logger for the scraper task
 */
function createScraperLogger() {
    const prefix = `[Scraper ${new Date().toISOString()}]`;
    return {
        info: (message: string) => console.log(`${prefix} INFO: ${message}`),
        error: (message: string) => console.error(`${prefix} ERROR: ${message}`),
    };
}

/**
 * Process a scraping task
 */
async function processScraperTask(
    job: Job<ScraperJobPayload>
): Promise<void> {
    const logger = createScraperLogger();
    const { userId, source, url, strategy } = job.data;

    logger.info(`Starting scrape job for ${source}: ${url}`);

    const cdpEndpoint = process.env.CHROME_CDP_ENDPOINT || 'http://localhost:9222';
    const adapter = new ChromeCdpAdapter({ cdpEndpoint });

    try {
        logger.info(`Connecting to Chrome at ${cdpEndpoint}`);
        await adapter.connect();

        // Select strategy based on source
        let scrapeStrategy;
        if (source === 'leboncoin') {
            scrapeStrategy = new LeboncoinStrategy();
        } else {
            throw new Error(`Unknown source: ${source}`);
        }

        logger.info(`Scraping ${url} with strategy: ${strategy}`);
        const result = await adapter.scrape<Array<ScrapedListing>>(url, scrapeStrategy);

        // Save to database
        const id = `scrape_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await db.insert(scrapedData).values({
            id,
            userId,
            source,
            sourceUrl: url,
            strategyName: strategy,
            data: result,
            itemCount: String(result.length),
        });

        logger.info(`Saved ${result.length} items with id: ${id}`);
    } catch (error) {
        logger.error(`Scrape job failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    } finally {
        await adapter.disconnect();
    }

    logger.info('Scrape job completed');
}

/**
 * Register the scraper worker with pg-boss
 */
export async function registerScraperWorker(boss: PgBoss): Promise<void> {
    await boss.work<ScraperJobPayload>(
        QUEUE_NAMES.SCRAPER,
        { batchSize: 1 },
        async (jobs) => {
            for (const job of jobs) {
                console.log('Processing scraper job');

                try {
                    await processScraperTask(job);
                } catch (error) {
                    console.error('Scraper job failed:', error);
                    throw error;
                }
            }
        }
    );

    console.log(`Registered worker for ${QUEUE_NAMES.SCRAPER}`);
}

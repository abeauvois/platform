import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { HonoEnv } from '../types';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { ChromeCdpAdapter, LeboncoinStrategy, AutoScout24Strategy, MaltStrategy } from '@platform/browser-scraper';
import { db } from '@platform/db';
import { scrapedData } from '@platform/db/schema';
import { eq, desc } from 'drizzle-orm';

// Request validation schemas
const scrapeRequestSchema = z.object({
    source: z.string().min(1),
    url: z.string().url(),
    strategy: z.enum(['listings']).default('listings'),
    save: z.boolean().default(true),
});

const listQuerySchema = z.object({
    source: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
});

// Schema for saving pre-scraped data
const saveDataSchema = z.object({
    source: z.string().min(1),
    sourceUrl: z.string().url(),
    strategyName: z.string().min(1),
    data: z.unknown(),
    itemCount: z.number().optional(),
});

// Simple logger
const createLogger = () => ({
    info: (msg: string) => console.log(`[scraper] ${msg}`),
    error: (msg: string) => console.error(`[scraper] ${msg}`),
});

export const scraper = new Hono<HonoEnv>()
    .use(authMiddleware)

    /**
     * POST /api/scraper/scrape
     * Trigger an on-demand scrape
     */
    .post('/scrape', zValidator('json', scrapeRequestSchema), async (c) => {
        const logger = createLogger();
        const user = c.get('user');
        const { source, url, strategy, save } = c.req.valid('json');

        const cdpEndpoint = process.env.CHROME_CDP_ENDPOINT || 'http://localhost:9222';
        const adapter = new ChromeCdpAdapter({ cdpEndpoint });

        try {
            logger.info(`Connecting to Chrome at ${cdpEndpoint}`);
            await adapter.connect();

            logger.info(`Scraping ${url} with strategy: ${strategy}`);

            // Select strategy based on source
            let scrapeStrategy;
            if (source === 'leboncoin') {
                scrapeStrategy = new LeboncoinStrategy();
            } else if (source === 'autoscout24') {
                scrapeStrategy = new AutoScout24Strategy();
            } else if (source === 'malt') {
                scrapeStrategy = new MaltStrategy();
            } else {
                return c.json({ error: `Unknown source: ${source}` }, 400);
            }

            const result = await adapter.scrape(url, scrapeStrategy);

            // Save to database if requested
            if (save && user) {
                const id = `scrape_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                await db.insert(scrapedData).values({
                    id,
                    userId: user.id,
                    source,
                    sourceUrl: url,
                    strategyName: strategy,
                    data: result,
                    itemCount: String(Array.isArray(result) ? result.length : 1),
                });
                logger.info(`Saved scrape result with id: ${id}`);
            }

            return c.json({
                success: true,
                data: result,
                itemCount: Array.isArray(result) ? result.length : 1,
            });
        } catch (error) {
            logger.error(`Scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return c.json({
                error: error instanceof Error ? error.message : 'Scrape failed'
            }, 500);
        } finally {
            await adapter.disconnect();
        }
    })

    /**
     * POST /api/scraper/data
     * Save pre-scraped data (from CLI or other sources)
     */
    .post('/data', zValidator('json', saveDataSchema), async (c) => {
        const logger = createLogger();
        const user = c.get('user');
        const { source, sourceUrl, strategyName, data, itemCount } = c.req.valid('json');

        const id = `scrape_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        await db.insert(scrapedData).values({
            id,
            userId: user!.id,
            source,
            sourceUrl,
            strategyName,
            data,
            itemCount: String(itemCount ?? (Array.isArray(data) ? data.length : 1)),
        });

        logger.info(`Saved scraped data with id: ${id}`);

        return c.json({ success: true, id });
    })

    /**
     * GET /api/scraper/data
     * List scraped data
     */
    .get('/data', zValidator('query', listQuerySchema), async (c) => {
        const user = c.get('user');
        const { source, limit } = c.req.valid('query');

        const query = db.select().from(scrapedData)
            .where(eq(scrapedData.userId, user!.id))
            .orderBy(desc(scrapedData.scrapedAt))
            .limit(limit);

        const results = await query;

        // Filter by source if provided
        const filtered = source
            ? results.filter(r => r.source === source)
            : results;

        return c.json({ items: filtered });
    })

    /**
     * GET /api/scraper/data/:id
     * Get specific scraped item
     */
    .get('/data/:id', async (c) => {
        const user = c.get('user');
        const id = c.req.param('id');

        const [result] = await db.select().from(scrapedData)
            .where(eq(scrapedData.id, id))
            .limit(1);

        if (!result) {
            return c.json({ error: 'Not found' }, 404);
        }

        if (result.userId !== user!.id) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        return c.json(result);
    });

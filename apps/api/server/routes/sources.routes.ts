import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { createGmailSourceReader } from '../infrastructure/source-readers/GmailSourceReader';
import type { SourceReaderConfig } from '@platform/platform-domain';

// Simple logger for source reading
const createLogger = () => ({
    info: (msg: string) => console.log(`[sources] ${msg}`),
    warning: (msg: string) => console.warn(`[sources] ${msg}`),
    error: (msg: string) => console.error(`[sources] ${msg}`),
    debug: (msg: string) => console.debug(`[sources] ${msg}`),
    await: () => ({ start: () => {}, stop: () => {}, update: () => {} }),
});

export const sources = new Hono<HonoEnv>()
    .use(authMiddleware)

    /**
     * GET /api/sources/gmail/read
     * Directly read Gmail messages without triggering a workflow task
     *
     * Query params:
     * - email: Filter by sender email address
     * - limitDays: Limit to emails from the last N days
     * - withUrl: Only include emails containing URLs
     */
    .get('/gmail/read', async (c) => {
        const logger = createLogger();
        const sourceReader = createGmailSourceReader(logger);

        if (!sourceReader) {
            return c.json({ error: 'Gmail source not configured. Check GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN.' }, 503);
        }

        // Parse query parameters
        const email = c.req.query('email');
        const limitDaysParam = c.req.query('limitDays');
        const withUrlParam = c.req.query('withUrl');

        const config: SourceReaderConfig = {
            filter: {},
        };

        if (email) {
            config.filter!.email = email;
        }

        if (limitDaysParam) {
            config.filter!.limitDays = parseInt(limitDaysParam, 10);
        }

        if (withUrlParam === 'true') {
            config.filter!.withUrl = true;
        }

        try {
            const items = await sourceReader.read(config);

            // Serialize BaseContent to plain objects for JSON response
            const serializedItems = items.map(item => ({
                url: item.url,
                sourceAdapter: item.sourceAdapter,
                tags: item.tags,
                summary: item.summary,
                rawContent: item.rawContent,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                contentType: item.contentType,
            }));

            return c.json({ items: serializedItems });
        } catch (error) {
            logger.error(`Failed to read Gmail: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return c.json({ error: error instanceof Error ? error.message : 'Failed to read Gmail' }, 500);
        }
    });

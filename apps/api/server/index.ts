// Validate environment variables first - fail fast if misconfigured
import { env } from './env';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createQueue, initBoss, scheduleRecurringTask, stopBoss } from '@platform/task';
import { auth } from './lib/auth';
import { bookmarks } from './routes/bookmark.routes';
import { config } from './routes/config.routes';
import { workflows } from './routes/workflow.routes';
import { sources } from './routes/sources.routes';
import { scraper } from './routes/scraper.routes';
import { settings } from './routes/settings.routes';
import { registerAllWorkers } from './tasks/workers';
import { QUEUE_NAMES } from './tasks/types';
import { DrizzleBackgroundTaskRepository } from './infrastructure/DrizzleBackgroundTaskRepository';

const app = new Hono();

// Environment-based URL configuration for CORS (using validated env)
const DASHBOARD_URL = env.DASHBOARD_URL || `http://localhost:${env.DASHBOARD_PORT}`;
const TRADING_CLIENT_URL = env.TRADING_CLIENT_URL || `http://localhost:${env.TRADING_CLIENT_PORT}`;

// Allowed origins for CORS
const allowedOrigins = [
  DASHBOARD_URL,
  TRADING_CLIENT_URL,
  ...(process.env.CLIENT_URLS?.split(',').filter(Boolean) || []),
];

// Helper to check if origin is allowed
function isAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  return allowedOrigins.includes(origin) ? origin : null;
}

const router = app
  .use(logger())
  .use(
    '/api/*',
    cors({
      origin: (origin) => isAllowedOrigin(origin),
      credentials: true,
    })
  )
  .get('/api/health', (c) => c.json({ status: 'ok' }))
  .on(['POST', 'GET', 'OPTIONS'], '/api/auth/*', async (c) => {
    const origin = c.req.header('origin');
    const allowedOrigin = isAllowedOrigin(origin ?? null);

    // Debug logging
    console.log('[AUTH CORS]', { origin, allowedOrigin, allowedOrigins });

    // Handle preflight
    if (c.req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin || '',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }

    // Get response from better-auth
    const response = await auth.handler(c.req.raw);

    // Clone response and add CORS headers
    const newHeaders = new Headers(response.headers);
    if (allowedOrigin) {
      newHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
      newHeaders.set('Access-Control-Allow-Credentials', 'true');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  })
  .route('/api/bookmarks', bookmarks)
  .route('/api/config', config)
  .route('/api/workflows', workflows)
  .route('/api/sources', sources)
  .route('/api/scraper', scraper)
  .route('/api/settings', settings);

export type AppType = typeof router;

// Initialize pg-boss and workers
async function startJobQueue() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    const boss = await initBoss({ connectionString: process.env.DATABASE_URL });

    // Create queues
    await createQueue(QUEUE_NAMES.WORKFLOW);
    await createQueue(QUEUE_NAMES.BOOKMARK_ENRICHMENT);
    await createQueue(QUEUE_NAMES.SCRAPER);

    // Register workers
    const taskRepository = new DrizzleBackgroundTaskRepository();
    await registerAllWorkers(boss, taskRepository);

    // Schedule daily bookmark enrichment at 11:59 AM UTC
    await scheduleRecurringTask(
      'daily-bookmark-enrichment',
      '59 11 * * *',
      QUEUE_NAMES.BOOKMARK_ENRICHMENT,
      { preset: 'bookmarkEnrichment' }
    );

    console.log('Job queue initialized with daily enrichment schedule');
  } catch (error) {
    console.error('Failed to initialize job queue:', error);
    // Continue without job queue - endpoints will fail gracefully
  }
}

// Graceful shutdown handler
async function shutdown() {
  console.log('Shutting down...');
  await stopBoss();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start job queue
startJobQueue();

const PORT = Number((globalThis as any).Bun?.env?.PORT ?? process.env.PORT) || 3000;
export default {
  port: PORT,
  fetch: app.fetch,
};

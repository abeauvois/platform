import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './lib/auth';
import { bookmarks } from './routes/bookmark.routes';
import { config } from './routes/config.routes';
import { workflows } from './routes/workflow.routes';
import { sources } from './routes/sources.routes';
import { initBoss, stopBoss, createQueue } from '@platform/task';
import { registerAllWorkers } from './tasks/workers';
import { QUEUE_NAMES } from './tasks/types';
import { DrizzleBackgroundTaskRepository } from './infrastructure/DrizzleBackgroundTaskRepository';

const app = new Hono();

const router = app
  .use(logger())
  .use(
    '/api/*',
    cors({
      origin: (origin) => {
        const allowedOrigins = [
          'http://localhost:5000', // dashboard
          'http://localhost:5001', // trading client
          ...(process.env.CLIENT_URLS?.split(',') || []),
        ];
        if (allowedOrigins.includes(origin)) {
          return origin;
        }
        return null;
      },
      credentials: true,
    })
  )
  .get('/api/health', (c) => c.json({ status: 'ok' }))
  .on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))
  .route('/api/bookmarks', bookmarks)
  .route('/api/config', config)
  .route('/api/workflows', workflows)
  .route('/api/sources', sources);

export type AppType = typeof router;

// Initialize pg-boss and workers
async function startJobQueue() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    const boss = await initBoss({ connectionString: process.env.DATABASE_URL });
    await createQueue(QUEUE_NAMES.WORKFLOW);
    const taskRepository = new DrizzleBackgroundTaskRepository();
    await registerAllWorkers(boss, taskRepository);
    console.log('Job queue initialized');
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

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './lib/auth';
import { todos } from './routes/todo.routes';
import { bookmarks } from './routes/bookmark.routes';
import { config } from './routes/config.routes';
import { ingest } from './routes/ingest.routes';
import { initializeBoss, stopBoss } from './jobs/boss';
import { registerAllWorkers } from './jobs/workers';

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
  .on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))
  .route('/api/todos', todos)
  .route('/api/bookmarks', bookmarks)
  .route('/api/config', config)
  .route('/api/ingest', ingest);

export type AppType = typeof router;

// Initialize pg-boss and workers
async function startJobQueue() {
  try {
    const boss = await initializeBoss();
    await registerAllWorkers(boss);
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

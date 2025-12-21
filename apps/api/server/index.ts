import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './lib/auth';
import { todos } from './routes/todo.routes';
import { bookmarks } from './routes/bookmark.routes';
import { config } from './routes/config.routes';

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
  .route('/api/config', config);

export type AppType = typeof router;

export default {
  port: 3000,
  fetch: app.fetch,
};

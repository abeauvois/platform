import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { serveStatic } from 'hono/bun';
import { logger } from 'hono/logger';

import { auth } from './lib/auth';
import { tickerOpenApi } from './routes/ticker.openapi.routes';
import { balanceOpenApi } from './routes/balance.openapi.routes';

const app = new OpenAPIHono();

// Middleware
app.use(logger());
app.use('/*', serveStatic({ root: './client/dist' }));

// Auth routes (non-OpenAPI)
app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw));

// Trading API routes with OpenAPI documentation
app.route('/api/trading/ticker', tickerOpenApi);
app.route('/api/trading/balance', balanceOpenApi);

// OpenAPI JSON spec endpoint
app.doc('/api/docs/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Trading API',
    version: '1.0.0',
    description: 'API for trading operations with Binance exchange integration',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
  ],
  tags: [
    {
      name: 'Ticker',
      description: 'Public market data endpoints - no authentication required',
    },
    {
      name: 'Balance',
      description: 'Account balance endpoints - requires Binance API credentials',
    },
  ],
});

// Scalar API Reference UI
app.get(
  '/api/docs',
  apiReference({
    theme: 'purple',
    url: '/api/docs/openapi.json',
    pageTitle: 'Trading API Documentation',
  })
);

export type AppType = typeof app;
export default app;

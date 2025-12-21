import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { tickerOpenApi } from './routes/ticker.openapi.routes';
import { balanceOpenApi } from './routes/balance.openapi.routes';
import { klinesOpenApi } from './routes/klines.openapi.routes';

const app = new OpenAPIHono();

// Middleware
app.use(logger());
app.use(
  '/*',
  cors({
    origin: (origin) => {
      const allowedOrigins = [
        'http://localhost:5001', // trading client
        'http://localhost:3000', // platform API
        ...(process.env.CLIENT_URLS?.split(',') || []),
      ];
      if (allowedOrigins.includes(origin)) {
        return origin;
      }
      return null;
    },
    credentials: true,
  })
);

// Trading API routes with OpenAPI documentation
app.route('/api/trading/ticker', tickerOpenApi);
app.route('/api/trading/balance', balanceOpenApi);
app.route('/api/trading/klines', klinesOpenApi);

// OpenAPI JSON spec endpoint
app.doc('/api/docs/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Trading API',
    version: '1.0.0',
    description:
      'Trading-specific API for Binance exchange integration. For authentication and shared features, see the Platform API at http://localhost:3000.',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Trading API (Development)',
    },
  ],
  tags: [
    {
      name: 'Ticker',
      description: 'Public market data endpoints - no authentication required',
    },
    {
      name: 'Market Data',
      description:
        'Historical candlestick data endpoints - no authentication required',
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

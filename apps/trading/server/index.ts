import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { createTickerOpenApiRoutes } from './routes/ticker.openapi.routes';
import { createTickersOpenApiRoutes } from './routes/tickers.openapi.routes';
import { createBalanceOpenApiRoutes } from './routes/balance.openapi.routes';
import { createMarginBalanceOpenApiRoutes } from './routes/margin-balance.openapi.routes';
import { createKlinesOpenApiRoutes } from './routes/klines.openapi.routes';
import { BinanceClient } from './adapters/BinanceClient';

// Create exchange clients (dependency injection at composition root)
// Public client for market data (ticker, klines)
const publicExchangeClient = new BinanceClient();

// Authenticated client for account operations (balances, orders)
const createAuthenticatedClient = () => {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      'BINANCE_API_KEY and BINANCE_API_SECRET must be set in environment'
    );
  }

  return new BinanceClient({ apiKey, apiSecret });
};

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
app.route('/api/trading/ticker', createTickerOpenApiRoutes(publicExchangeClient));
app.route('/api/trading/tickers', createTickersOpenApiRoutes(publicExchangeClient));
app.route('/api/trading/klines', createKlinesOpenApiRoutes(publicExchangeClient));

// Balance routes require authentication - create client lazily to allow startup without credentials
try {
  const authenticatedClient = createAuthenticatedClient();
  app.route('/api/trading/balance', createBalanceOpenApiRoutes(authenticatedClient));
  app.route('/api/trading/margin-balance', createMarginBalanceOpenApiRoutes(authenticatedClient));
} catch {
  // Balance routes unavailable without credentials - log warning but don't fail startup
  console.warn('Balance routes disabled: Binance API credentials not configured');
}

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
      description: 'Spot account balance endpoints - requires Binance API credentials',
    },
    {
      name: 'Margin',
      description: 'Margin account balance endpoints - requires Binance API credentials',
    },
  ],
});

// Scalar API Reference UI
app.get(
  '/api/docs',
  Scalar({
    theme: 'purple',
    url: '/api/docs/openapi.json',
    pageTitle: 'Trading API Documentation',
  })
);

export type AppType = typeof app;
export default app;

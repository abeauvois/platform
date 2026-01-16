// Validate environment variables first - fail fast if misconfigured
import { env, hasBinanceCredentials } from './env';

import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { createBalanceOpenApiRoutes } from './routes/balance.openapi.routes';
import { createKlinesOpenApiRoutes } from './routes/klines.openapi.routes';
import { createMarginBalanceOpenApiRoutes } from './routes/margin-balance.openapi.routes';
import { createOrderOpenApiRoutes } from './routes/order.openapi.routes';
import { createOrderStreamRoutes } from './routes/order-stream.routes';
import { createSettingsOpenApiRoutes } from './routes/settings.openapi.routes';
import { createSymbolsOpenApiRoutes } from './routes/symbols.openapi.routes';
import { createTickerOpenApiRoutes } from './routes/ticker.openapi.routes';
import { createTickersOpenApiRoutes } from './routes/tickers.openapi.routes';
import { createWatchlistOpenApiRoutes } from './routes/watchlist.openapi.routes';
import { BinanceClient } from './adapters/BinanceClient';
import { DrizzleUserSettingsRepository } from './infrastructure/DrizzleUserSettingsRepository';
import { DrizzleWatchlistRepository } from './infrastructure/DrizzleWatchlistRepository';

// Create exchange clients (dependency injection at composition root)
// Public client for market data (ticker, klines)
const publicExchangeClient = new BinanceClient();

// Watchlist repository for user watchlist persistence
const watchlistRepository = new DrizzleWatchlistRepository();

// User settings repository for trading preferences
const userSettingsRepository = new DrizzleUserSettingsRepository();

// Simple ID generator for watchlist items
const idGenerator = {
  generate: () => `wl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
};

// Authenticated client for account operations (balances, orders)
const createAuthenticatedClient = () => {
  if (!hasBinanceCredentials()) {
    throw new Error(
      'BINANCE_API_KEY and BINANCE_API_SECRET must be set in environment'
    );
  }

  return new BinanceClient({
    apiKey: env.BINANCE_API_KEY,
    apiSecret: env.BINANCE_API_SECRET
  });
};

const app = new OpenAPIHono();

// Environment-based URL configuration for CORS and OpenAPI (using validated env)
const TRADING_CLIENT_URL = env.TRADING_CLIENT_URL;
const API_URL = env.API_URL;
const TRADING_SERVER_URL = env.TRADING_SERVER_URL;

// Middleware
app.use(logger());
app.use(
  '/*',
  cors({
    origin: (origin) => {
      const allowedOrigins = [
        TRADING_CLIENT_URL,
        API_URL,
        ...(env.CLIENT_URLS ? env.CLIENT_URLS.split(',').filter(Boolean) : []),
      ];
      if (allowedOrigins.includes(origin)) {
        return origin;
      }
      return null;
    },
    credentials: true,
  })
);

// Health check endpoint for Railway deployment
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Trading API routes with OpenAPI documentation
app.route('/api/trading/ticker', createTickerOpenApiRoutes(publicExchangeClient));
app.route('/api/trading/tickers', createTickersOpenApiRoutes(publicExchangeClient));
app.route('/api/trading/klines', createKlinesOpenApiRoutes(publicExchangeClient));
app.route('/api/trading/symbols', createSymbolsOpenApiRoutes(publicExchangeClient));

// Watchlist route (requires user auth, uses public client for price data)
app.route('/api/trading/watchlist', createWatchlistOpenApiRoutes(
  watchlistRepository,
  publicExchangeClient,
  idGenerator
));

// User settings route (requires user auth)
app.route('/api/trading/settings', createSettingsOpenApiRoutes(userSettingsRepository));

// Balance and order routes require authentication - create client lazily to allow startup without credentials
try {
  const authenticatedClient = createAuthenticatedClient();
  app.route('/api/trading/balance', createBalanceOpenApiRoutes(authenticatedClient));
  app.route('/api/trading/margin-balance', createMarginBalanceOpenApiRoutes(authenticatedClient));
  app.route('/api/trading/order', createOrderOpenApiRoutes(authenticatedClient));
  app.route('/api/trading/order-stream', createOrderStreamRoutes(authenticatedClient));
} catch {
  // Authenticated routes unavailable without credentials - log warning but don't fail startup
  console.warn('Authenticated routes disabled: Binance API credentials not configured');
}

// OpenAPI JSON spec endpoint
app.doc('/api/docs/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Trading API',
    version: '1.0.0',
    description: `Trading-specific API for Binance exchange integration. For authentication and shared features, see the Platform API at ${API_URL}.`,
  },
  servers: [
    {
      url: TRADING_SERVER_URL,
      description: 'Trading API (Development)',
    },
  ],
  tags: [
    {
      name: 'Ticker',
      description: 'Public market data endpoints - no authentication required',
    },
    {
      name: 'Symbols',
      description: 'Tradable symbols listing - no authentication required',
    },
    {
      name: 'Market Data',
      description:
        'Historical candlestick data endpoints - no authentication required',
    },
    {
      name: 'Watchlist',
      description: 'User watchlist management - requires user authentication',
    },
    {
      name: 'Settings',
      description: 'User trading settings - requires user authentication',
    },
    {
      name: 'Balance',
      description: 'Spot account balance endpoints - requires Binance API credentials',
    },
    {
      name: 'Margin',
      description: 'Margin account balance endpoints - requires Binance API credentials',
    },
    {
      name: 'Orders',
      description: 'Order management endpoints - requires Binance API credentials',
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

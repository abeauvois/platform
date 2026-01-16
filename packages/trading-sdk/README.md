# @platform/trading-sdk

TypeScript SDK for trading operations with cross-service authentication support.

## Features

- Portfolio and balance management
- Position tracking
- Order management (market, limit, stop)
- Market data fetching (tickers, klines)
- Watchlist management
- User trading settings
- **Cross-service auth** via bearer tokens

## Installation

```bash
bun add @platform/trading-sdk
```

## Usage

### Browser with Bearer Token (Recommended)

For cross-origin authentication (e.g., trading-client → trading-server):

```typescript
import { TradingApiClient } from '@platform/trading-sdk';

const client = new TradingApiClient({
  baseUrl: 'https://trading-server.example.com',
  getToken: () => localStorage.getItem('auth_token'),
});

// Token is sent as: Authorization: Bearer <token>
const watchlist = await client.getWatchlist();
```

### Browser with Cookies (Same-Origin)

```typescript
import { TradingApiClient } from '@platform/trading-sdk';

const client = new TradingApiClient({
  baseUrl: 'http://localhost:3001',
  credentials: 'include', // Browser handles cookies
});
```

### With Custom Logger

```typescript
import { TradingApiClient } from '@platform/trading-sdk';

const client = new TradingApiClient({
  baseUrl: 'https://api.example.com',
  getToken: () => localStorage.getItem('auth_token'),
  logger: {
    info: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
    warning: (msg) => console.warn(`[WARN] ${msg}`),
    debug: (msg) => console.debug(`[DEBUG] ${msg}`),
  },
});
```

## Authentication Modes

| Mode | Config | Use Case |
|------|--------|----------|
| Bearer Token | `getToken: () => string` | Cross-origin (recommended) |
| Browser Cookies | `credentials: 'include'` | Same-origin only |
| Manual Token | `sessionToken` | CLI, scripts |

**Priority:** `getToken` > `sessionToken` > browser cookies

## API Reference

### Balance & Portfolio

```typescript
// Get spot wallet balances
const balances = await client.getSpotBalances();
// { balances: [...], count: 5, totalUsd: 10000 }

// Get margin account balances
const marginBalances = await client.getMarginBalances();

// Get max borrowable amount
const maxBorrow = await client.getMaxBorrowable('USDT');
```

### Watchlist (User Authenticated)

```typescript
// Get watchlist with current prices
const watchlist = await client.getWatchlist();
// [{ symbol: 'BTCUSDT', price: 92000, priceChangePercent24h: 2.5, addedAt: '...' }]

// Add to watchlist
await client.addToWatchlist('ETHUSDT');

// Remove from watchlist
await client.removeFromWatchlist('ETHUSDT');
```

### Orders

```typescript
// Create market order
const order = await client.createOrder({
  symbol: 'BTCUSDT',
  side: 'buy',
  type: 'market',
  quantity: 0.001,
});

// Create limit order
const limitOrder = await client.createOrder({
  symbol: 'ETHUSDT',
  side: 'sell',
  type: 'limit',
  quantity: 0.1,
  price: 3000,
});

// Get orders
const orders = await client.getOrders('BTCUSDT');

// Cancel order
await client.cancelOrder('order-id');
```

### Positions

```typescript
// Get all positions
const positions = await client.getPositions();

// Get specific position
const position = await client.getPosition('position-id');

// Close position
await client.closePosition('position-id');
```

### Market Data (Public)

```typescript
// Get ticker for symbol
const ticker = await client.getMarketTicker('BTCUSDT');
// { symbol, price, priceChangePercent24h, volume, ... }

// Get multiple tickers
const tickers = await client.getMarketTickers(['BTCUSDT', 'ETHUSDT']);

// Get klines/candlesticks
const klines = await client.getKlines({
  symbol: 'BTCUSDT',
  interval: '1h',
  limit: 100,
});

// Get prices
const prices = await client.getPrices(['BTCUSDT', 'ETHUSDT']);

// Search symbols
const symbols = await client.getSymbols({ quoteAsset: 'USDT' });
```

### User Settings

```typescript
// Get settings
const settings = await client.getUserSettings();

// Update settings
await client.updateUserSettings({
  defaultAccountMode: 'margin',
});
```

### Trade History

```typescript
// Get all trades
const trades = await client.getTradeHistory();

// Get trades for symbol with limit
const recentTrades = await client.getTradeHistory('BTCUSDT', 50);
```

## Cross-Service Authentication

The trading-sdk is designed to work with platform as the central auth provider:

```
┌─────────────────┐     Sign In      ┌─────────────────┐
│  Trading Client │ ───────────────► │   Platform API  │
│                 │                  │                 │
│                 │ ◄─────────────── │                 │
│                 │  Bearer Token    │                 │
└────────┬────────┘  (set-auth-token)└─────────────────┘
         │
         │ Authorization: Bearer <token>
         ▼
┌─────────────────┐
│ Trading Server  │ ← Uses same BETTER_AUTH_SECRET
└─────────────────┘   to validate tokens
```

### Client Setup Example

```typescript
// auth-token.ts
export function getAuthToken(): string | null {
  return localStorage.getItem('platform_auth_token');
}

export function saveAuthToken(token: string): void {
  localStorage.setItem('platform_auth_token', token);
}

// auth-client.ts (better-auth)
import { createAuthClient } from 'better-auth/react';
import { saveAuthToken } from './auth-token';

export const authClient = createAuthClient({
  baseURL: 'https://platform-api.example.com',
  fetchOptions: {
    credentials: 'include',
    onSuccess: (ctx) => {
      const token = ctx.response.headers.get('set-auth-token');
      if (token) saveAuthToken(token);
    },
  },
});

// trading-client.ts
import { TradingApiClient } from '@platform/trading-sdk';
import { getAuthToken } from './auth-token';

export const tradingClient = new TradingApiClient({
  baseUrl: 'https://trading-server.example.com',
  getToken: getAuthToken,
});
```

## Dependencies

- `@platform/sdk` - Base client with auth infrastructure
- `@platform/platform-domain` - Shared domain types
- `@platform/trading-domain` - Trading-specific types

## Related Packages

- [@platform/sdk](../platform-sdk) - Platform API client
- [@platform/auth](../platform-auth) - Authentication package
- [@platform/trading-domain](../trading-domain) - Trading domain types

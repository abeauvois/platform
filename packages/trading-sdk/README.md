# Trading SDK

A TypeScript SDK for trading operations that extends the platform SDK's authentication capabilities.

## Overview

The Trading SDK provides a comprehensive client for trading operations including:

- Portfolio management
- Position tracking
- Order management
- Market data fetching
- Trade history

It reuses the authentication infrastructure from `@platform/sdk` and domain types from `@platform/domain`, following the monorepo's hexagonal architecture patterns.

## Installation

```bash
# From the monorepo root
bun install

# Build the package
cd packages/trading-sdk
bun run build
```

## Usage

### Basic Setup

```typescript
import { TradingApiClient } from "@platform/trading-sdk";
import type { ILogger } from "@platform/domain";

// Create a simple logger (or use your own implementation)
const logger: ILogger = {
  info: (msg: string) => console.log(msg),
  error: (msg: string) => console.error(msg),
  warn: (msg: string) => console.warn(msg),
  debug: (msg: string) => console.debug(msg),
};

// Initialize the client
const client = new TradingApiClient({
  baseUrl: "https://api.example.com",
  logger,
});
```

### Authentication

The Trading SDK extends `PlatformApiClient`, so all authentication methods are available:

```typescript
// Sign up a new user
const authResponse = await client.signUp({
  email: "user@example.com",
  password: "securePassword123",
  name: "John Doe",
});

// Or sign in an existing user
const authResponse = await client.signIn({
  email: "user@example.com",
  password: "securePassword123",
});

// The sessionToken is automatically stored internally
// You can also manually set it:
client.setSessionToken(authResponse.sessionToken);
```

### Portfolio Operations

```typescript
// Get portfolio summary
const portfolio = await client.getPortfolio();
console.log(`Total Equity: $${portfolio.totalEquity}`);
console.log(
  `Total P&L: $${portfolio.totalPnL} (${portfolio.totalPnLPercent}%)`
);

// View all balances
portfolio.balances.forEach((balance) => {
  console.log(
    `${balance.asset}: ${balance.total} (${balance.free} free, ${balance.locked} locked)`
  );
});
```

### Position Management

```typescript
// Get all open positions
const positions = await client.getPositions();

// Get a specific position
const position = await client.getPosition("position-id");

// Close a position
await client.closePosition("position-id");
```

### Order Management

```typescript
// Create a market order
const order = await client.createOrder({
  symbol: "BTC/USD",
  side: "buy",
  type: "market",
  quantity: 0.1,
});

// Create a limit order
const limitOrder = await client.createOrder({
  symbol: "ETH/USD",
  side: "sell",
  type: "limit",
  quantity: 1.0,
  price: 2500.0,
  timeInForce: "GTC", // Good-Till-Cancelled
});

// Get all orders
const allOrders = await client.getOrders();

// Get orders for a specific symbol
const btcOrders = await client.getOrders("BTC/USD");

// Get orders by status
const filledOrders = await client.getOrders(undefined, "filled");

// Get a specific order
const orderDetails = await client.getOrder("order-id");

// Cancel an order
await client.cancelOrder("order-id");
```

### Market Data (Public - No Auth Required)

```typescript
// Get ticker for a single symbol
const ticker = await client.getMarketTicker("BTC/USD");
console.log(`${ticker.symbol}: $${ticker.lastPrice}`);

// Get multiple tickers
const tickers = await client.getMarketTickers([
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
]);

// Get all available tickers
const allTickers = await client.getMarketTickers();
```

### Trade History

```typescript
// Get all trades
const trades = await client.getTradeHistory();

// Get trades for a specific symbol
const btcTrades = await client.getTradeHistory("BTC/USD");

// Get limited number of trades
const recentTrades = await client.getTradeHistory(undefined, 50);

// Get recent BTC trades
const recentBtcTrades = await client.getTradeHistory("BTC/USD", 20);
```

## Architecture

The Trading SDK follows the monorepo's architectural principles:

### Inheritance from Platform SDK

```typescript
TradingApiClient extends PlatformApiClient
```

This means:

- All authentication methods (`signUp`, `signIn`, `signOut`) are inherited
- Session token management is handled automatically
- Protected methods like `authenticatedRequest` can be reused

### Reusing Domain Types

The SDK depends on `@platform/domain` for shared interfaces:

- `ILogger` - Logging interface
- `Bookmark` - For any bookmark-related features (if needed)

### Type Safety

All types are fully typed with TypeScript:

- Request types: `CreateOrderData`, etc.
- Response types: `Order`, `Position`, `Portfolio`, `Trade`, etc.
- Auth types: Re-exported from `@platform/sdk`

## API Reference

### TradingApiClient Methods

#### Authentication (Inherited)

- `signUp(data: SignUpData): Promise<AuthResponse>`
- `signIn(data: SignInData): Promise<AuthResponse>`
- `signOut(): Promise<void>`
- `setSessionToken(token: string): void`
- `clearSessionToken(): void`

#### Portfolio

- `getPortfolio(): Promise<Portfolio>`

#### Positions

- `getPositions(): Promise<Position[]>`
- `getPosition(positionId: string): Promise<Position>`
- `closePosition(positionId: string): Promise<void>`

#### Orders

- `createOrder(data: CreateOrderData): Promise<Order>`
- `getOrders(symbol?: string, status?: string): Promise<Order[]>`
- `getOrder(orderId: string): Promise<Order>`
- `cancelOrder(orderId: string): Promise<void>`

#### Market Data

- `getMarketTicker(symbol: string): Promise<MarketTicker>`
- `getMarketTickers(symbols?: string[]): Promise<MarketTicker[]>`

#### Trade History

- `getTradeHistory(symbol?: string, limit?: number): Promise<Trade[]>`

## Development

### Building

```bash
bun run build
```

### Running Tests

```bash
# Unit tests
bun run test:unit

# Integration tests
bun run test:integration

# All tests
bun run test
```

### Development Mode (Watch)

```bash
bun run dev
```

## Dependencies

- `@platform/domain` - Shared domain types and interfaces
- `@platform/sdk` - Platform SDK with authentication
- `typescript` - TypeScript compiler
- `bun` - Runtime and build tool

## License

Part of the platform monorepo.

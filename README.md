# Platform

A modular platform for building real-world applications with Bun, TypeScript, and hexagonal architecture.

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTS                                            │
├─────────────────────┬─────────────────────┬─────────────────────────────────────────┤
│     Dashboard       │   Trading Client    │              CLI                         │
│   (React + Vite)    │   (React + Vite)    │           (cleye)                        │
│     Port 5000       │     Port 5001       │                                          │
│                     │                     │                                          │
│  ┌───────────────┐  │  ┌───────────────┐  │  ┌───────────────┐                       │
│  │ @platform/sdk │  │  │@platform/     │  │  │ @platform/sdk │                       │
│  │               │  │  │trading-sdk    │  │  │ @platform/    │                       │
│  │ @platform/ui  │  │  │               │  │  │ sdk-cli       │                       │
│  └───────┬───────┘  │  │ @platform/ui  │  │  └───────┬───────┘                       │
│          │          │  └───────┬───────┘  │          │                               │
└──────────┼──────────┴──────────┼──────────┴──────────┼───────────────────────────────┘
           │                     │                     │
           │    ┌────────────────┼─────────────────────┘
           │    │                │
           ▼    ▼                ▼
┌─────────────────────┐  ┌─────────────────────┐
│   Platform API      │  │   Trading Server    │
│   (Hono)            │  │   (Hono + OpenAPI)  │
│   Port 3000         │  │   Port 3001         │
│                     │  │                     │
│ • Auth (better-auth)│  │ • Market Data       │
│ • Bookmarks         │  │ • Orders            │
│ • Workflows         │  │ • Positions         │
│ • Config            │  │ • Watchlist         │
│ • Background Tasks  │  │ • Binance API       │
│                     │  │                     │
│  ┌───────────────┐  │  │  ┌───────────────┐  │
│  │ @platform/auth│  │  │  │ @platform/auth│  │
│  │ @platform/db  │  │  │  │ @platform/db  │  │
│  │ @platform/task│  │  │  │ @platform/    │  │
│  └───────────────┘  │  │  │ trading-domain│  │
└──────────┬──────────┘  │  └───────────────┘  │
           │             └──────────┬──────────┘
           │                        │
           ▼                        ▼
┌─────────────────────────────────────────────┐
│              PostgreSQL Database             │
│                                              │
│  • Users & Sessions (better-auth)            │
│  • Bookmarks, Workflows, Tasks               │
│  • Watchlist, Trading Settings               │
└──────────────────────────────────────────────┘
```

## Cross-Service Authentication Flow

Platform serves as the central authentication provider. Other services (like trading-server) validate tokens issued by platform.

```
┌─────────────────┐     1. Sign In      ┌─────────────────┐
│  Trading Client │ ──────────────────► │   Platform API  │
│                 │                     │                 │
│                 │ ◄────────────────── │  (better-auth)  │
│                 │  2. Session Cookie  │                 │
│                 │  + Bearer Token     │                 │
│                 │  (set-auth-token)   │                 │
└────────┬────────┘                     └─────────────────┘
         │
         │ 3. API Request with
         │    Authorization: Bearer <token>
         ▼
┌─────────────────┐
│ Trading Server  │
│                 │
│ Validates token │
│ using shared    │
│ BETTER_AUTH_    │
│ SECRET          │
└─────────────────┘
```

**Key Points:**
- Platform API issues both session cookies and bearer tokens
- Bearer tokens enable cross-service authentication
- All services share the same `BETTER_AUTH_SECRET` to validate tokens
- Clients store bearer token in localStorage for cross-origin requests

## Directory Structure

```
/apps
├── api/              # Central platform server (Hono, port 3000)
├── dashboard/        # Web dashboard client (React + Vite, port 5000)
├── trading-server/   # Trading-specific APIs (Hono + OpenAPI, port 3001)
├── trading-client/   # Trading client (React + Vite, port 5001)
├── cli/              # Command-line interface (cleye)
└── cli-landing/      # CLI landing page (React + Vite, port 5002)

/packages
├── platform-task/       # Background task abstractions (pg-boss)
├── platform-domain/     # Shared domain entities and services
├── platform-auth/       # Authentication (better-auth + bearer plugin)
├── platform-db/         # Database schema (Drizzle ORM + PostgreSQL)
├── platform-sdk/        # Platform API client SDK
├── platform-env/        # Environment variable definitions
├── platform-utils/      # Shared utility functions
├── platform-ui/         # Shared UI components (React + TailwindCSS)
├── trading-domain/      # Trading-specific domain models
├── trading-sdk/         # Trading API client SDK
├── cached-http-client/  # HTTP client with caching
└── sdk-cli/             # CLI SDK utilities
```

## Dependency Matrix

### Apps → Packages Dependencies

| App             | task | domain | auth | db  | sdk | env | utils | ui  | t-domain | t-sdk | cached-http |
|-----------------|:----:|:------:|:----:|:---:|:---:|:---:|:-----:|:---:|:--------:|:-----:|:-----------:|
| api             |  ✓   |   ✓    |  ✓   |  ✓  |     |  ✓  |   ✓   |     |          |       |      ✓      |
| dashboard       |      |   ✓    |      |     |  ✓  |     |       |  ✓  |          |       |             |
| trading-server  |      |        |  ✓   |  ✓  |     |  ✓  |       |     |    ✓     |       |             |
| trading-client  |      |        |      |     |     |     |       |  ✓  |    ✓     |   ✓   |             |
| cli             |      |   ✓    |      |     |  ✓  |     |   ✓   |     |          |       |             |
| cli-landing     |      |        |      |     |     |     |       |     |          |       |             |

### Package → Package Dependencies

```
Foundation Layer (no workspace dependencies):
├── @platform/task         # pg-boss wrapper
├── @platform/auth         # better-auth wrapper
├── @platform/db           # Drizzle schema
├── @platform/env          # Environment config
├── @platform/utils        # Utilities
├── @platform/ui           # UI components
├── @platform/cached-http-client
└── @platform/trading-domain

Domain Layer:
└── @platform/platform-domain
    └── depends on: @platform/task

SDK Layer:
├── @platform/sdk
│   └── depends on: @platform/platform-domain
│
└── @platform/trading-sdk
    └── depends on: @platform/platform-domain
                    @platform/trading-domain
                    @platform/sdk

CLI Layer:
└── @platform/sdk-cli
    └── depends on: @platform/sdk
                    @platform/platform-domain
```

## Hexagonal Architecture

The core domain follows hexagonal architecture (ports and adapters):

```
┌─────────────────────────────────────────┐
│           User Interfaces               │
│  (CLI, Web UI, REST API)                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Application Layer               │
│  (Use Cases, Services, Orchestration)   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│          Domain Layer                   │
│  (Entities, Ports/Interfaces)           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Infrastructure Layer               │
│  (Adapters: DB, API, File System)       │
└─────────────────────────────────────────┘
```

- **Domain**: Core business logic independent of frameworks
- **Application**: Use cases and business workflows
- **Infrastructure**: Adapters for external services

## Technology Stack

| Category    | Technology                              |
|-------------|----------------------------------------|
| Runtime     | Bun                                    |
| Language    | TypeScript                             |
| Backend     | Hono (lightweight HTTP framework)      |
| Frontend    | React 19 + Vite + TailwindCSS          |
| Routing     | TanStack Router                        |
| State       | TanStack React Query                   |
| Database    | PostgreSQL + Drizzle ORM               |
| Auth        | better-auth (with bearer plugin)       |
| Job Queue   | pg-boss (via @platform/task)           |
| API Docs    | OpenAPI + Scalar (trading-server)      |

## Ports Reference

| App             | Port | Purpose                                    |
|-----------------|------|--------------------------------------------|
| api             | 3000 | Central platform server                    |
| dashboard       | 5000 | React frontend for the platform            |
| trading-server  | 3001 | Trading-specific APIs (Binance)            |
| trading-client  | 5001 | Trading client with auth + trading         |
| cli-landing     | 5002 | CLI landing page                           |

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- PostgreSQL (via Docker)

### Installation

```bash
bun install
bun run build
```

### Running Applications

```bash
# Start API server + dashboard (main development)
bun run dev

# Start all apps (API + dashboard + trading server + trading client)
bun run dev:all

# Individual apps
bun run api            # Start API server (port 3000)
bun run dashboard      # Start dashboard client (port 5000)
bun run trading:server # Start trading server (port 3001)
bun run trading:client # Start trading client (port 5001)

# CLI
bun run cli            # Run CLI
```

### Database

```bash
bun run db:up          # Start PostgreSQL via Docker
bun run db:generate    # Generate migrations
bun run db:migrate     # Run migrations
bun run db:studio      # Open Drizzle Studio
```

### Building

```bash
bun run build          # Build all packages
bun run build:lib      # Build library packages
```

### Testing

```bash
bun run test:unit      # Run unit tests
bun run ci:local       # Run full CI locally (typecheck + lint + build + test)
```

## Package Documentation

### @platform/auth

Authentication package built on better-auth with bearer token support for cross-service authentication.

```typescript
import { createAuth } from '@platform/auth';

const auth = createAuth({
  db,
  schema,
  provider: 'pg',
  trustedOrigins: ['https://your-app.com'],
});
```

**Features:**
- Email/password authentication
- Session management with cookies
- Bearer tokens for cross-service auth (via bearer plugin)
- OpenAPI documentation

### @platform/sdk

Platform API client SDK with support for cookie and bearer token authentication.

```typescript
import { PlatformApiClient } from '@platform/sdk';

// Browser with cookies
const client = new PlatformApiClient({
  baseUrl: 'http://localhost:3000',
  credentials: 'include',
});

// Cross-service with bearer token
const client = new PlatformApiClient({
  baseUrl: 'http://localhost:3000',
  getToken: () => localStorage.getItem('auth_token'),
});
```

### @platform/trading-sdk

Trading API client SDK for market data and trading operations.

```typescript
import { TradingApiClient } from '@platform/trading-sdk';

const client = new TradingApiClient({
  baseUrl: 'http://localhost:3001',
  getToken: () => localStorage.getItem('auth_token'),
});

// Get watchlist
const watchlist = await client.getWatchlist();

// Get market data
const ticker = await client.getMarketTicker('BTCUSDT');
```

### @platform/task

Background task abstractions following hexagonal architecture.

```typescript
import { initBoss, createQueue, registerWorker } from '@platform/task';

const boss = await initBoss({ connectionString: process.env.DATABASE_URL });
await createQueue('my-queue');
await registerWorker('my-queue', async (job) => {
  // Process job
});
```

### @platform/db

Database schema and migrations using Drizzle ORM.

```typescript
import { db, eq } from '@platform/db';
import { users } from '@platform/db/schema';

const user = await db.select().from(users).where(eq(users.id, userId));
```

## Environment Variables

### Platform API (apps/api)

| Variable              | Required | Description                    |
|-----------------------|----------|--------------------------------|
| DATABASE_URL          | Yes      | PostgreSQL connection string   |
| APP_ENV               | Yes      | `development` or `production`  |
| BETTER_AUTH_SECRET    | Yes      | Auth signing secret            |
| TRADING_CLIENT_URL    | Yes      | For CORS                       |
| DASHBOARD_URL         | No       | For CORS                       |

### Trading Server (apps/trading-server)

| Variable              | Required | Description                    |
|-----------------------|----------|--------------------------------|
| DATABASE_URL          | Yes      | PostgreSQL connection string   |
| BETTER_AUTH_SECRET    | Yes      | Auth signing secret (same!)    |
| BINANCE_API_KEY       | Yes      | Binance API key                |
| BINANCE_API_SECRET    | Yes      | Binance API secret             |
| TRADING_CLIENT_URL    | Yes      | For CORS                       |

### Trading Client (apps/trading-client)

| Variable              | Required | Description                    |
|-----------------------|----------|--------------------------------|
| VITE_AUTH_API_URL     | Yes      | Platform API URL               |
| VITE_TRADING_API_URL  | Yes      | Trading Server URL             |

## Deployment

See [docs/railway-troubleshooting.md](docs/railway-troubleshooting.md) for Railway deployment guide and common issues.

## License

MIT

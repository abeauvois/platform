# Platform

A modular platform for building real-world applications with Bun, TypeScript, and hexagonal architecture.

## Architecture Overview

This is a Bun-based TypeScript monorepo with workspaces for apps and packages.

```
/apps
├── api/              # Central platform server (Hono, port 3000)
├── dashboard/        # Web client (React + Vite, port 5000)
├── trading/          # Trading app with hybrid architecture
│   ├── server/       # Trading-specific APIs (Hono + OpenAPI, port 3001)
│   └── client/       # Trading client (React + Vite, port 5001)
└── cli/              # Command-line interface

/packages
├── platform-task/       # Background task abstractions (pg-boss)
├── platform-domain/     # Shared domain entities, ports, and services
├── platform-auth/       # Authentication (better-auth)
├── platform-db/         # Database schema (Drizzle ORM + PostgreSQL)
├── platform-sdk/        # Platform API client SDK
├── trading-domain/      # Trading-specific domain models
├── trading-sdk/         # Trading API client SDK
└── cached-http-client/  # HTTP client with caching

/src                  # Legacy domain code (being migrated to packages/domain)
├── domain/           # Core business logic and entities
├── application/      # Use cases and workflows
└── infrastructure/   # Adapters for external services
```

## Hexagonal Architecture (Ports and Adapters)

The core domain follows hexagonal architecture:

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

## Client-Server Architecture

| App | Port | Purpose |
|-----|------|---------|
| api | 3000 | Central platform server (auth, todos, bookmarks, config) |
| dashboard | 5000 | React frontend for the platform |
| trading server | 3001 | Trading-specific APIs (Binance integration) |
| trading client | 5001 | Connects to both API server (auth) and trading server |

### Configuration

The API server (`/apps/api`) is the single source of truth for configuration. Environment variables are stored in `/apps/api/.env` and served via the `/api/config` endpoint.

- CLI and clients fetch config from the API (requires authentication)
- Use `ApiConfigProvider` from `@platform/sdk` to load config
- Use `EnvConfigProvider` for direct `.env` access (API server only)

## Technology Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Backend**: Hono (lightweight HTTP framework)
- **Frontend**: React 19 + Vite + TailwindCSS + DaisyUI
- **Routing**: TanStack Router
- **State**: TanStack React Query
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: better-auth
- **Job Queue**: pg-boss (via @platform/task)

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
bun run api           # Start API server (port 3000)
bun run dashboard     # Start dashboard client (port 5000)
bun run trading:server # Start trading server (port 3001)
bun run trading:client # Start trading client (port 5001)

# CLI
bun run cli           # Run CLI
bun run cli:dev       # Run CLI in watch mode
```

### Database (from /apps/api)

```bash
bun run db:up         # Start PostgreSQL via Docker
bun run db:generate   # Generate migrations
bun run db:migrate    # Run migrations
bun run db:studio     # Open Drizzle Studio
```

### Building

```bash
bun run build         # Build all packages
bun run build:lib     # Build library packages
```

### Testing

```bash
bun run test:unit     # Run unit tests
bun run test:e2e      # Run end-to-end tests
bun run it:notion     # Integration tests for Notion
bun run it:twitter    # Integration tests for Twitter
```

### Session Management

The CLI stores session tokens in `~/.platform-cli/session.json`. If your session expires (401 errors), renew it:

```bash
# Using environment variables (recommended)
export PLATFORM_EMAIL="your@email.com"
export PLATFORM_PASSWORD="yourpassword"
bun run api:renew-session

# Or pass credentials directly
bun run api:renew-session your@email.com yourpassword
```

## Packages

### @platform/task

Background task abstractions following hexagonal architecture. Provides a unified "Task" concept for background jobs.

```typescript
import { initBoss, PgBossTaskRunner, TimestampIdGenerator } from '@platform/task';

// Initialize pg-boss
const boss = await initBoss({ connectionString: process.env.DATABASE_URL });

// Create task runner
const taskRunner = new PgBossTaskRunner(boss);
await taskRunner.submit('my-task', { data: 'payload' });
```

### @platform/platform-domain

Shared domain entities, ports, and services used across applications.

### @platform/auth

Authentication package built on better-auth.

### @platform/db

Database schema and migrations using Drizzle ORM with PostgreSQL.

### @platform/sdk

Platform API client SDK for authentication and API communication.

```typescript
import { Auth, Fetcher } from "@platform/sdk";

const auth = new Auth({ baseUrl: "http://localhost:3000" });
const credentials = await auth.login();

const fetcher = new Fetcher({
  baseUrl: "http://localhost:3000",
  credentials,
});
```

### @platform/trading-domain

Trading-specific domain models and business logic.

### @platform/trading-sdk

Trading API client SDK for market data and trading operations.

### @platform/cached-http-client

HTTP client with built-in caching support.

## Key Patterns

- Workspace packages use `workspace:*` protocol for dependencies
- Shared types exported from `@platform/domain`
- Authentication handled by `@platform/auth` package
- Database schema centralized in `@platform/db` package

## License

MIT

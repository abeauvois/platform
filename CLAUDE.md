# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Monorepo Structure

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
├── domain/           # Shared domain entities, ports, and services
├── platform-auth/    # Authentication (better-auth)
├── platform-db/               # Database schema (Drizzle ORM + PostgreSQL)
├── platform-sdk/     # Platform API client SDK
├── trading-domain/   # Trading-specific domain models
├── trading-sdk/      # Trading API client SDK
└── cached-http-client/ # HTTP client with caching

/src                  # Legacy domain code (being migrated to packages/domain)
├── domain/           # Core business logic and entities
├── application/      # Use cases and workflows
└── infrastructure/   # Adapters for external services
```

## Architecture

### Hexagonal Architecture (Ports and Adapters)

The core domain follows hexagonal architecture:

- `src/domain`: Core business logic and domain models
- `src/application`: Use cases and business workflows
- `src/infrastructure`: Adapters for external services

### Client-Server Architecture

- **Central API Server** (`/apps/api`): Handles auth, todos, bookmarks, config, and shared features
- **Dashboard Client** (`/apps/dashboard`): React frontend for the platform
- **Trading Server** (`/apps/trading/server`): Trading-specific APIs (Binance integration)
- **Trading Client** (`/apps/trading/client`): Hybrid - connects to both API server (auth) and trading server (trading APIs)
- **CLI** (`/apps/cli`): Command-line interface that fetches config from the API server

### Configuration

The API server (`/apps/api`) is the single source of truth for configuration. Environment variables (API keys, tokens, etc.) are stored in `/apps/api/.env` and served via the `/api/config` endpoint.

- CLI and other clients fetch config from the API (requires authentication)
- Use `ApiConfigProvider` from `@platform/sdk` to load config from the API
- Use `EnvConfigProvider` from `@platform/sdk` for direct `.env` file access (API server only)

### Key Patterns

- Workspace packages use `workspace:*` protocol for dependencies
- Shared types exported from `@platform/domain`
- Authentication handled by `@platform/auth` package
- Database schema in `@platform/db` package

## Common Commands

### Development

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

### Building

```bash
bun run build         # Build all packages
bun run build:lib     # Build library packages
```

### Database (from /apps/api)

```bash
bun run db:up         # Start PostgreSQL via Docker
bun run db:generate   # Generate migrations
bun run db:migrate    # Run migrations
bun run db:studio     # Open Drizzle Studio
```

### Testing

```bash
bun run test:unit     # Run unit tests
bun run test:e2e      # Run end-to-end tests
bun run it:notion     # Integration tests for Notion
bun run it:twitter    # Integration tests for Twitter
```

## Ports Summary

| App            | Port | Purpose                 |
| -------------- | ---- | ----------------------- |
| api            | 3000 | Central platform server |
| dashboard      | 5000 | Web dashboard client    |
| trading server | 3001 | Trading-specific APIs   |
| trading client | 5001 | Trading client          |

## Technology Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Backend**: Hono (lightweight HTTP framework)
- **Frontend**: React 19 + Vite + TailwindCSS + DaisyUI
- **Routing**: TanStack Router
- **State**: TanStack React Query
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: better-auth

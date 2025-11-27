# Platform - Build real world apps quicker

A modern, modular platform for managing personal bookmarks with AI-powered categorization and multi-source ingestion. Built with Bun, TypeScript, and hexagonal architecture principles.

## 🎯 Overview

This monorepo contains multiple applications and packages that work together to provide a complete bookmark management solution:

- **Web Application** - Full-stack app with React frontend and Hono backend
- **CLI Application** - Command-line interface for bookmark operations
- **Platform SDK** - Reusable SDK for authentication and API communication
- **Domain Package** - Shared domain entities and business logic

## 📁 Project Structure

```
platform/
├── apps/                          # Applications
│   ├── cli/                       # Command-line interface
│   │   ├── index.ts              # CLI entry point
│   │   ├── commands/             # CLI commands
│   │   ├── package.json          # Independent package
│   │   └── README.md             # CLI documentation
│   └── web/                       # Web application
│       ├── server/               # Hono API server
│       │   ├── index.ts          # Server entry
│       │   ├── routes/           # API routes
│       │   ├── db/               # Database (Drizzle ORM)
│       │   └── lib/              # Better-auth setup
│       └── client/               # React frontend
│           ├── src/              # React components
│           └── vite.config.ts    # Vite configuration
│
├── packages/                      # Shared packages
│   ├── platform-sdk/             # Platform SDK (NEW)
│   │   ├── src/
│   │   │   ├── auth/Auth.ts      # Authentication client
│   │   │   ├── fetcher/Fetcher.ts # API client
│   │   │   ├── logger/           # Logging adapter
│   │   │   └── ports/            # Interfaces
│   │   └── tests/
│   │       ├── unit/             # Unit tests
│   │       └── integration/      # Integration tests
│   ├── domain/                   # Shared domain entities
│   │   └── src/
│   │       └── entities/
│   │           └── Bookmark.ts   # Core domain model
│   └── cached-http-client/       # HTTP client library
│
├── src/                          # Legacy email extraction (to be migrated)
│   ├── domain/
│   ├── application/
│   └── infrastructure/
│
└── docs/                         # Documentation
    └── ai/                       # AI assistant guides
```

## 🏗️ Architecture Principles

### Hexagonal Architecture (Ports & Adapters)

All applications follow hexagonal architecture for maximum flexibility and testability:

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
│  (Entities, Ports/Interfaces)          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Infrastructure Layer               │
│  (Adapters: DB, API, File System)      │
└─────────────────────────────────────────┘
```

**Key Principles:**

- **Domain First**: Business logic is independent of frameworks
- **Dependency Inversion**: Dependencies point inward toward domain
- **Ports & Adapters**: Interfaces define contracts, implementations are swappable
- **Test-Driven Development**: Write tests first, implementation second

### Monorepo Benefits

- **Code Sharing**: Common domain logic across apps
- **Independent Deployment**: Each app can be built/deployed separately
- **Type Safety**: TypeScript across the entire stack
- **Unified Testing**: Consistent testing patterns

## 🚀 Applications

### 1. CLI Application (`apps/cli`)

Command-line interface for bookmark management.

**Features:**

- List bookmarks from API
- Ingest bookmarks from Gmail, CSV, etc.
- Interactive authentication
- Session persistence

**Usage:**

```bash
# List bookmarks
bun run platform personal bookmark list

# Ingest from Gmail
bun run platform personal bookmark ingest -f gmail

# With custom API URL
PLATFORM_API_URL=http://localhost:5000 bun run platform personal bookmark list
```

**Architecture:**

- Uses `@platform/sdk` for API communication
- Independent package with own `package.json`
- Can be built and deployed separately

### 2. Web Application (`apps/web`)

Full-stack web application with React frontend and Hono backend.

**Frontend (React + TanStack Router):**

- Modern React with TypeScript
- TanStack Router for routing
- Vite for building

**Backend (Hono API):**

- REST API at `http://localhost:5000/api`
- Better-auth for authentication
- Drizzle ORM for database
- PostgreSQL database

**API Endpoints:**

- `POST /api/auth/sign-up/email` - User registration
- `POST /api/auth/sign-in/email` - User login
- `GET /api/bookmarks` - List bookmarks (authenticated)
- `POST /api/bookmarks` - Create bookmark (authenticated)

**Start the web app:**

```bash
cd apps/web
bun run dev
```

### 3. Platform SDK (`packages/platform-sdk`)

Reusable SDK for API communication used by CLI and other apps.

**Components:**

- **Auth** - Email/password authentication with session management
- **Fetcher** - HTTP client for bookmark operations
- **Logger** - Terminal logging adapter

**Example Usage:**

```typescript
import { Auth, Fetcher, CliuiLogger } from "@platform/sdk";

const logger = new CliuiLogger();
const auth = new Auth({ baseUrl: "http://localhost:5000", logger });
const credentials = await auth.login();

const fetcher = new Fetcher({
  baseUrl: "http://localhost:5000",
  credentials,
  logger,
});
const bookmarks = await fetcher.fetchBookmarks();
```

**Testing:**

- Unit tests: 8/8 passing
- Integration tests: 4/4 passing
- TDD approach throughout

## 🔧 Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- PostgreSQL (for web app)
- Node.js 18+ (optional, for compatibility)

### Installation

```bash
# Install all dependencies
bun install

# Build all packages
bun run build
```

### Running Applications

```bash
# Web application (frontend + backend)
cd apps/web && bun run dev

# CLI application
bun run platform personal bookmark list

# Build SDK
bun run build:sdk
```

### Testing

```bash
# SDK unit tests
cd packages/platform-sdk && bun test tests/unit/

# SDK integration tests (requires server running)
cd packages/platform-sdk && bun test tests/integration/

# Legacy tests
bun run test:unit
bun run it
bun run test:e2e
```

## 🔑 Configuration

### Environment Variables

Create `.env` files in respective directories:

**Root `.env`** (for legacy CLI):

```bash
ANTHROPIC_API_KEY=your-key
NOTION_INTEGRATION_TOKEN=your-token
NOTION_DATABASE_ID=your-db-id
TWITTER_BEARER_TOKEN=your-token
```

**`apps/web/.env`**:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/bookmarks
CLIENT_URL=http://localhost:3001
```

### CLI Configuration

The CLI stores session in `~/.platform-cli/session.json` for persistent authentication.

## 📚 Documentation

### Application Docs

- **[apps/cli/README.md](./apps/cli/README.md)** - CLI usage and testing
- **[apps/cli/IMPLEMENTATION_SUMMARY.md](./apps/cli/IMPLEMENTATION_SUMMARY.md)** - CLI implementation details
- **[apps/web/README.md](./apps/web/README.md)** - Web app setup and deployment

### Architecture & Testing

- **[docs/ai/TDD.md](./docs/ai/TDD.md)** - Test-Driven Development guide
- **[docs/ai/TESTING_GUIDE.md](./docs/ai/TESTING_GUIDE.md)** - Testing strategies
- **[docs/ai/ARCHITECTURE_TESTING.md](./docs/ai/ARCHITECTURE_TESTING.md)** - Testing hexagonal architecture
- **[docs/ai/AI_TDD_PROMPTS.md](./docs/ai/AI_TDD_PROMPTS.md)** - AI assistant prompts
- **[.clinerules](./.clinerules)** - Project rules for AI assistants

### Legacy Features (Email Extraction)

- **[docs/GMAIL_COMMAND.md](./docs/GMAIL_COMMAND.md)** - Gmail integration
- **[docs/SELECT_COMMAND.md](./docs/SELECT_COMMAND.md)** - Interactive selection

## 🎯 Key Features

### Bookmark Management

- ✅ Create, read bookmarks via REST API
- ✅ Tag-based organization
- ✅ AI-powered categorization (legacy)
- ✅ Multi-source ingestion (Gmail, CSV)

### Authentication & Security

- ✅ Email/password authentication (Better-auth)
- ✅ Session management with cookies
- ✅ JWT tokens for API access
- ✅ Secure password hashing

### Developer Experience

- ✅ TypeScript throughout
- ✅ Hot reload in development
- ✅ Comprehensive testing (unit + integration)
- ✅ Type-safe API client (SDK)
- ✅ Independent app deployment

## 🚢 Deployment

### CLI

```bash
cd apps/cli
bun run build
# Deploy dist/index.js as standalone executable
```

### Web Application

```bash
cd apps/web
bun run build
# Deploys to Fly.io or similar
```

### Platform SDK

```bash
cd packages/platform-sdk
bun run build
# Can be published to npm as @platform/sdk
```

## 🤝 Contributing

This project follows TDD and hexagonal architecture principles:

1. **Write tests first** - Define expected behavior
2. **Implement minimal code** - Make tests pass
3. **Refactor** - Improve code quality
4. **Respect layer boundaries** - Domain never imports from infrastructure

## 📄 License

MIT

---

Built with ❤️ using Bun, TypeScript, and modern web technologies.

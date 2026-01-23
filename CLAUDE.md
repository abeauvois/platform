# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Monorepo Structure

This is a Bun-based TypeScript monorepo with workspaces for apps and packages.

```
/apps
├── api/              # Central platform server (Hono, port 3000)
├── dashboard/        # Web client (React + Vite, port 5000)
├── trading-server/   # Trading-specific APIs (Hono + OpenAPI, port 3001)
├── trading-client/   # Trading client (React + Vite, port 5001)
└── cli/              # Command-line interface (cleye)

/packages
├── platform-task/       # Background task abstractions (pg-boss adapters, Task types)
├── platform-domain/     # Shared domain entities and services (depends on platform-task)
├── platform-auth/       # Authentication (better-auth)
├── platform-db/         # Database schema (Drizzle ORM + PostgreSQL)
├── platform-sdk/        # Platform API client SDK
├── trading-domain/      # Trading-specific domain models
├── trading-sdk/         # Trading API client SDK
└── cached-http-client/  # HTTP client with caching, throttling, and retry

/src
└── utils/            # Legacy utilities (HtmlLinksParser.ts)
```

## Architecture

this monorepo entirely relies on Hexagonal Architecture (Ports & Adapters)

IMPORTANT: key hexagonal architecture principle: the application layer should express domain intent, not implementation details.

### Client-Server Architecture

- **Central API Server** (`/apps/api`): Handles auth, todos, bookmarks, config, workflows, and background tasks (via @platform/task)
- **Dashboard Client** (`/apps/dashboard`): React frontend for the platform
- **Trading Server** (`/apps/trading-server`): Trading-specific APIs with Binance integration and OpenAPI docs at `/api/docs`
- **Trading Client** (`/apps/trading-client`): Hybrid - connects to both API server (auth) and trading server (trading APIs)
- **CLI** (`/apps/cli`): Command-line interface using cleye framework with commands in `/apps/cli/commands/`

### Configuration

The API server (`/apps/api`) is the single source of truth for configuration. Environment variables (API keys, tokens, etc.) are stored in `/apps/api/.env` and served via the `/api/config` endpoint.

- CLI and other clients fetch config from the API (requires authentication)
- Use `ApiConfigProvider` from `@platform/sdk` to load config from the API
- Use `EnvConfigProvider` from `@platform/sdk` for direct `.env` file access (API server only)

### Key Patterns

- Workspace packages use `workspace:*` protocol for dependencies
- Shared types exported from `@platform/platform-domain`
- Authentication handled by `@platform/auth` package
- Database schema in `@platform/db` package

### Task Abstraction Pattern

Background tasks follow hexagonal architecture with a unified "Task" concept:

- **Domain**: Uses `taskId`, `TaskStatus`, `BackgroundTask` (not "job" terminology)
- **Ports**: `IBackgroundTaskRunner`, `IIdGenerator` in `@platform/task`
- **Adapters**: `PgBossTaskRunner`, `TimestampIdGenerator` implement the ports
- **Infrastructure mapping**: Repository maps domain (`taskId`) ↔ database (`id`, `pgBossJobId`)

```typescript
// Domain service expresses intent, not implementation
const task = await taskService.startTask(userId, request);
// Returns BackgroundTask with taskId, not "jobId"
```

### API Server Structure

The API server (`/apps/api/server`) follows hexagonal architecture:

```
/apps/api/server/
├── infrastructure/          # Adapters implementing domain ports
│   ├── DrizzleBackgroundTaskRepository.ts  # IBackgroundTaskRepository
│   ├── GmailApiClient.ts                   # IEmailClient
│   ├── InMemoryBookmarkRepository.ts       # ILinkRepository
│   ├── InMemoryTimestampRepository.ts      # ITimestampRepository
│   └── source-readers/                     # Direct source reader factories
│       └── GmailSourceReader.ts            # ISourceReader for Gmail
├── tasks/                   # Background task workers (pg-boss)
│   ├── types.ts             # Task payload/result types
│   └── workers/             # Worker implementations
│       ├── workflow.worker.ts # Workflow worker
│       ├── presets.ts       # Workflow preset configurations
│       └── workflow.steps.ts # Workflow step implementations
├── routes/                  # HTTP API adapters
│   ├── workflow.routes.ts   # Task-based workflows (async)
│   └── sources.routes.ts    # Direct source reading (sync)
└── validators/              # Request validation (Zod)
```

### Source Reading Patterns

Two patterns for reading from data sources:

1. **Task-based (async)**: `POST /api/workflows` → pg-boss task → polls for completion
   - Use for long-running workflows with analysis/enrichment steps
   - CLI: `bun run cli workflow gmail`

2. **Direct (sync)**: `GET /api/sources/gmail/read` → immediate response
   - Use for quick reads without workflow processing
   - CLI: `bun run cli list source gmail --filter=email@example.com --limit-days=7 --with-url`
   - Returns `BaseContent[]` directly, no task queue involved

## Test-Driven Development (TDD) Requirements

this apply to all new features and bug fixes on the backend codebase.
Do not use TDD for frontend, documentation or configuration files except
when explicitly instructed.

### MANDATORY: Always Follow Red-Green-Refactor

When creating new features:

1. **RED**: Write failing tests first

   ```typescript
   // Example prompt response:
   // "Let me write the tests first to define the expected behavior..."
   ```

2. **GREEN**: Implement minimal code to pass

   ```typescript
   // "Now implementing the simplest solution to make tests pass..."
   ```

3. **REFACTOR**: Clean up the code
   ```typescript
   // "Tests are passing. Let's refactor to improve quality..."
   ```

## Code Style & Conventions

### File Extensions

```typescript
// ✅ GOOD: Use .ts extension for imports (Bun resolves these automatically)
import { MyService } from './MyService.ts'
import { utils } from '@platform/domain'

// ❌ NEVER: Use .js extension in imports or create .js files
import { MyService } from './MyService.js'  // WRONG
```

**Rules:**
- Never create `.js` files - always use `.ts` (or `.tsx` for React components)
- Never use `.js` extensions in import statements
- Exception: Config files that require `.js` (e.g., `postcss.config.js`, `tailwind.config.js`)

### TypeScript

```typescript
// ✅ GOOD: Explicit types
async function analyzeLink(url: string): Promise<LinkAnalysis> {
  return await this.analyzer.analyze(url);
}

// ❌ AVOID: Implicit any
async function analyzeLink(url) {
  return await this.analyzer.analyze(url);
}
```

### Array Types

```typescript
// ✅ GOOD: Use Array<T> syntax
function getOrders(): Promise<Array<FetchedOrder>> {
  return this.orderService.fetchAll();
}

const items: Array<string> = [];

// ❌ AVOID: T[] syntax
function getOrders(): Promise<FetchedOrder[]> {
  return this.orderService.fetchAll();
}

const items: string[] = [];
```

### Dependency Injection

```typescript
// ✅ GOOD: Constructor injection with interfaces
export class LinkAnalysisService {
  constructor(
    private readonly analyzer: IContentAnalyser,
    private readonly logger: ILogger
  ) {}
}

// ❌ AVOID: Direct instantiation
export class LinkAnalysisService {
  private analyzer = new UrlAndContextAnthropicAnalyser();
}
```

### Error Handling

```typescript
// ✅ GOOD: Explicit error types
if (!url.startsWith('http')) {
  throw new Error(`Invalid URL format: ${url}`);
}

// ✅ GOOD: Logging errors
catch (error) {
  this.logger.error(`Failed to analyze link: ${error.message}`);
  throw error;
}
```

### Data Fetching (Frontend)

```typescript
// ✅ GOOD: Use TanStack Query with SDK client
import { useQuery, useMutation } from '@tanstack/react-query'
import { tradingClient } from '@/lib/trading-client'

function useBalances() {
  return useQuery({
    queryKey: ['balances'],
    queryFn: () => tradingClient.getBalances(),
  })
}

// ❌ AVOID: Direct fetch calls in components or lib files
async function fetchBalances() {
  const response = await fetch('/api/trading/balance')
  return response.json()
}
```

**Rules:**
- Always use TanStack Query for server state management in frontend apps
- Create SDK client instances for API interactions
- Never use raw `fetch()` for API calls in frontend apps
- Define query keys in a centralized factory (`query-keys.ts`)

## Anti-Patterns to AVOID

### ❌ Don't Skip Tests

```typescript
// WRONG: Implementing without tests
export class NewFeature {
  doWork() {
    // ... implementation without tests
  }
}

// RIGHT: Test first, then implement
test("should do expected work", () => {
  const feature = new NewFeature();
  expect(feature.doWork()).toEqual(expected);
});
```

### ❌ Don't Violate Layer Boundaries

```typescript
// WRONG: Domain importing from Infrastructure
// src/domain/entities/Bookmark.ts
import { NotionClient } from '../../infrastructure/adapters/NotionClient.js';

// RIGHT: Domain defines port, Infrastructure implements it
// src/domain/ports/IRepository.ts
export interface IRepository { ... }
```

### ❌ Don't Mock Everything

```typescript
// WRONG: Mocking simple logic
const mockMapper = {
  map: jest.fn(() => result),
};

// RIGHT: Use real implementation for simple logic
const mapper = new RealMapper();
const result = mapper.map(input);
```

### ❌ Don't Use Node.js APIs Without Bun Compatibility Check

```typescript
// CAREFUL: Ensure Bun supports the API
import { promises as fs } from "fs"; // ✅ Bun supports this
import someLegacyModule from "legacy-package"; // ⚠️ May not work in Bun
```

## 🎯 AI Assistant Behavior Guidelines

### When Asked to Add a Feature

1. **First Response**: "Let me start with TDD approach. I'll write tests first to define the expected behavior."
2. Ask clarifying questions if needed:
   - Which layer does this belong to?
   - What are the inputs/outputs?
   - Should this be a new port or use existing ones?
3. Write failing tests
4. Implement minimal solution
5. Refactor with tests passing

### When Asked to Fix a Bug

1. **First**: Try to reproduce with a test
2. Run existing tests to understand scope
3. Fix the issue
4. Ensure all tests pass

### When Asked to Refactor

1. **First**: Ensure tests exist for current behavior
2. If no tests, write them first
3. Refactor with tests passing
4. Never change behavior without explicit request

## Custom Slash Commands

Custom commands are stored in `.claude/commands/`. When a user invokes a command like `/ci-fix`, read the corresponding file `.claude/commands/ci-fix.md` and follow its instructions.

Available commands:
- `/ci-fix` - Run CI and fix errors iteratively

## When Modifying Existing Code

### Always Check Tests First

```
1. Find related tests
2. Run tests: bun run test:unit
3. Ensure tests still pass after changes
4. Add new tests for new behavior
```

### Refactoring Checklist

- [ ] Tests written/updated BEFORE code changes
- [ ] All existing tests still pass
- [ ] No layer boundary violations
- [ ] Dependencies injected via constructors
- [ ] Error cases handled
- [ ] Types are explicit (no `any`)

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
```

### Building

```bash
bun run build         # Build library packages
```

### Database (in dev mode postgress deamon in a docker instance)

```bash
bun run db:up         # Start PostgreSQL via Docker
bun run db:down       # Stop PostgreSQL
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
- **Job Queue**: pg-boss (v12+, via @platform/task)
- **CLI**: cleye

## Creating New Apps or Packages

When creating a new app in `/apps` or a new package in `/packages` that requires:
- A new port (server or client)
- A new URL endpoint

You MUST:
1. Add the new port/URL variables to `/.env.example`
2. Update `scripts/worktree.sh` to include the new port in the offset calculation
3. Update CORS allowlists in relevant servers if the new app needs API access
4. Update Dockerfile files that copy workspace `package.json` files (see below)

### Dockerfile Updates for Workspace Changes

When adding, removing, or renaming apps/packages, you MUST update the affected Dockerfiles:
- `apps/api/Dockerfile` - copies all workspace `package.json` files for lockfile resolution
- `apps/trading-server/Dockerfile` - if trading server dependencies change

The API Dockerfile must list ALL workspace packages for `bun install --frozen-lockfile` to work:
```dockerfile
# All apps
COPY apps/api/package.json ./apps/api/
COPY apps/cli/package.json ./apps/cli/
COPY apps/trading-server/package.json ./apps/trading-server/
COPY apps/trading-client/package.json ./apps/trading-client/
# ... all other apps

# All packages
COPY packages/cached-http-client/package.json ./packages/cached-http-client/
# ... all other packages
```

Failure to update Dockerfiles will cause CI/CD builds to fail with "lockfile had changes" errors.

## Git Worktree for Parallel Development

Use the worktree script to create isolated environments for parallel PR development:

```bash
# Create a new worktree with port offset
./scripts/worktree.sh create feature-branch 100

# List all worktrees
./scripts/worktree.sh list

# Remove a worktree
./scripts/worktree.sh remove feature-branch
```

Port offset scheme:
| Offset | API  | Dashboard | Trading Server | Trading Client |
|--------|------|-----------|----------------|----------------|
| 0      | 3000 | 5000      | 3001           | 5001           |
| 100    | 3100 | 5100      | 3101           | 5101           |
| 200    | 3200 | 5200      | 3201           | 5201           |

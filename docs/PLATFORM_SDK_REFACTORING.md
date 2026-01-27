# Platform SDK Refactoring Guide

## Overview

The Platform SDK has been refactored to be a **generic, reusable API client** that depends only on domain ports, making it suitable for use across multiple applications (CLI, web dashboard, trading SDK, etc.).

## What Changed

### Before: Tightly Coupled SDK

- SDK contained its own ports (`IAuth`, `IFetcher`, `ILogger`)
- CLI-specific logic (file system, terminal prompts) lived in SDK
- `Auth` class handled session storage in `~/.platform-cli/`
- `CliuiLogger` with terminal UI dependencies in SDK
- Not reusable across different app types

### After: Generic, Reusable SDK

- SDK depends **only on `@abeauvois/platform-domain`**
- Single generic `PlatformApiClient` class
- CLI-specific logic moved to `apps/cli/lib/`
- No file system or terminal dependencies in SDK
- Easily reusable for web apps, mobile apps, trading systems, etc.

## New Architecture

```
┌─────────────────────────────────────────────────┐
│  Applications (CLI, Web, Trading, etc.)         │
│  - AuthManager (app-specific)                   │
│  - Logger (app-specific)                        │
└─────────────────┬───────────────────────────────┘
                  │
                  │ uses
                  ▼
┌─────────────────────────────────────────────────┐
│  @abeauvois/platform-sdk                                  │
│  - PlatformApiClient (generic HTTP client)      │
│  - Types (API request/response interfaces)      │
└─────────────────┬───────────────────────────────┘
                  │
                  │ depends on
                  ▼
┌─────────────────────────────────────────────────┐
│  @abeauvois/platform-domain                               │
│  - ILogger                                      │
│  - Bookmark                                     │
│  - Other domain entities                        │
└─────────────────────────────────────────────────┘
```

## Package Structure

### packages/platform-sdk/

```
├── src/
│   ├── index.ts              # Exports PlatformApiClient + types
│   ├── PlatformApiClient.ts  # Generic HTTP client
│   └── types.ts              # API request/response types
├── tests/unit/
│   └── test-platform-api-client.test.ts
├── package.json              # Depends ONLY on @abeauvois/platform-domain
└── tsconfig.json
```

**Key Point**: No CLI dependencies (`@poppinss/cliui`) or Node.js file system operations.

### apps/cli/lib/

```
├── AuthManager.ts     # Session management + terminal prompts
└── CliuiLogger.ts     # Terminal UI logger (implements ILogger)
```

## API Reference

### PlatformApiClient

```typescript
import { PlatformApiClient } from "@abeauvois/platform-sdk";
import type { ILogger } from "@abeauvois/platform-domain";

const client = new PlatformApiClient({
  baseUrl: "http://localhost:3000",
  sessionToken: "optional-token", // For authenticated requests
  logger: logger, // ILogger from domain
});
```

#### Authentication Methods (Public API)

```typescript
// Sign up new user
const authResponse = await client.signUp({
  email: "user@example.com",
  password: "password123",
  name: "John Doe",
});

// Sign in existing user
const authResponse = await client.signIn({
  email: "user@example.com",
  password: "password123",
});

// Sign out (requires sessionToken)
await client.signOut();
```

#### Bookmark Methods (Authenticated)

```typescript
// Set session token for authenticated requests
client.setSessionToken("session-token-here");

// Fetch bookmarks
const bookmarks = await client.fetchBookmarks();

// Create bookmark
const bookmark = await client.createBookmark({
  url: "https://example.com",
  sourceAdapter: "Other",
  tags: ["example", "test"],
  summary: "Example bookmark",
});

// Update bookmark
const updated = await client.updateBookmark("bookmark-id", {
  tags: ["updated", "example"],
});

// Delete bookmark
await client.deleteBookmark("bookmark-id");
```

#### Session Management

```typescript
// Update session token
client.setSessionToken("new-token");

// Clear session token
client.clearSessionToken();
```

### AuthManager (CLI-specific)

```typescript
import { AuthManager } from "../lib/AuthManager.js";
import { CliuiLogger } from "../lib/CliuiLogger.js";

const logger = new CliuiLogger();
const authManager = new AuthManager({
  baseUrl: "http://localhost:3000",
  logger,
});

// Login (checks file, prompts if needed)
const credentials = await authManager.login();

// Sign up new user
const credentials = await authManager.signUp(
  "John Doe",
  "user@example.com",
  "password123"
);

// Logout (API call + clear file)
await authManager.logout();

// Get current session
const session = authManager.getCurrentSession();
```

## Usage Examples

### CLI Application

```typescript
// apps/cli/commands/list.ts
import { AuthManager } from "../lib/AuthManager.js";
import { CliuiLogger } from "../lib/CliuiLogger.js";
import { PlatformApiClient } from "@abeauvois/platform-sdk";

const logger = new CliuiLogger();
const baseUrl = process.env.PLATFORM_API_URL || "http://localhost:3000";

// 1. Authenticate
const authManager = new AuthManager({ baseUrl, logger });
const credentials = await authManager.login();

// 2. Create API client with session
const apiClient = new PlatformApiClient({
  baseUrl,
  sessionToken: credentials.sessionToken,
  logger,
});

// 3. Use API
const bookmarks = await apiClient.fetchBookmarks();
console.table(bookmarks);
```

### Web Application (Hypothetical)

```typescript
// apps/web-dashboard/lib/BrowserAuthManager.ts
import { PlatformApiClient } from "@abeauvois/platform-sdk";

class BrowserAuthManager {
  private apiClient: PlatformApiClient;

  constructor(baseUrl: string, logger: ILogger) {
    this.apiClient = new PlatformApiClient({ baseUrl, logger });
  }

  async login(email: string, password: string) {
    const auth = await this.apiClient.signIn({ email, password });
    // Store in localStorage instead of file system
    localStorage.setItem("session", JSON.stringify(auth));
    return auth;
  }

  async logout() {
    await this.apiClient.signOut();
    localStorage.removeItem("session");
  }

  getCurrentSession() {
    const data = localStorage.getItem("session");
    return data ? JSON.parse(data) : null;
  }
}
```

### Trading SDK (Hypothetical)

```typescript
// packages/trading-sdk/src/TradingApiClient.ts
import { PlatformApiClient } from "@abeauvois/platform-sdk";
import type { ILogger } from "@abeauvois/platform-domain";

export class TradingApiClient {
  private platformClient: PlatformApiClient;

  constructor(config: {
    baseUrl: string;
    sessionToken: string;
    logger: ILogger;
  }) {
    this.platformClient = new PlatformApiClient(config);
  }

  // Trading-specific methods can reuse platform auth
  async executeTrade(data: TradeData): Promise<Trade> {
    // Uses same session token for authentication
    return await this.platformClient.authenticatedRequest<Trade>(
      "/api/trades",
      { method: "POST", body: JSON.stringify(data) }
    );
  }
}
```

## Migration Guide

### For Existing CLI Code

**Old way:**

```typescript
import { Auth, Fetcher, CliuiLogger } from "@abeauvois/platform-sdk";

const logger = new CliuiLogger();
const auth = new Auth({ baseUrl, logger });
const credentials = await auth.login();
const fetcher = new Fetcher({ baseUrl, credentials, logger });
const bookmarks = await fetcher.fetchBookmarks();
```

**New way:**

```typescript
import { PlatformApiClient } from "@abeauvois/platform-sdk";
import { AuthManager } from "../lib/AuthManager.js";
import { CliuiLogger } from "../lib/CliuiLogger.js";

const logger = new CliuiLogger();
const authManager = new AuthManager({ baseUrl, logger });
const credentials = await authManager.login();
const apiClient = new PlatformApiClient({
  baseUrl,
  sessionToken: credentials.sessionToken,
  logger,
});
const bookmarks = await apiClient.fetchBookmarks();
```

## Benefits

1. **True Reusability**: SDK can be used in CLI, web, mobile, server-side apps
2. **Clean Separation**: Auth logic is now app-specific (file vs localStorage vs memory)
3. **Minimal Dependencies**: SDK only depends on domain, no UI libraries
4. **Easy Testing**: Mock ILogger from domain, no file system mocking needed
5. **Future-Proof**: Easy to add new apps (trading, analytics, etc.)

## Testing

### SDK Tests

```bash
cd packages/platform-sdk
bun test:unit     # Unit tests for PlatformApiClient
bun test:integration  # Integration tests with real API
```

### CLI Tests

```bash
cd apps/cli
bun test          # Tests for AuthManager, CliuiLogger, commands
```

## Environment Variables

### SDK

- None required (baseUrl passed in constructor)

### CLI

- `PLATFORM_API_URL` - API base URL (default: `http://localhost:3000`)

## Session Storage

### CLI

- Stored in: `~/.platform-cli/session.json`
- Format: `{ sessionToken, userId, email }`
- Managed by: `AuthManager`

### Web (hypothetical)

- Stored in: `localStorage` or `sessionStorage`
- Managed by: `BrowserAuthManager`

### Server (hypothetical)

- Stored in: Memory or Redis
- Managed by: `ServerAuthManager`

## Contributing

When adding new API endpoints:

1. Add types to `packages/platform-sdk/src/types.ts`
2. Add method to `PlatformApiClient`
3. Add tests to `packages/platform-sdk/tests/unit/`
4. Update this documentation

## Related Documentation

- `apps/cli/README.md` - CLI usage guide
- `apps/cli/IMPLEMENTATION_SUMMARY.md` - Original implementation notes
- `packages/platform-sdk/tests/unit/test-platform-api-client.test.ts` - SDK tests

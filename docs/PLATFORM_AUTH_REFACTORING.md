# Platform Auth Refactoring

## Overview

This document describes the refactoring that centralizes authentication infrastructure across the platform monorepo. Previously, both `apps/trading` and `apps/web` had duplicate better-auth configurations. Now they share a common auth package.

## Architecture

### Before Refactoring

```
apps/trading/
├── server/lib/auth.ts          # Duplicate better-auth config
└── package.json                # better-auth dependency

apps/web/
├── server/lib/auth.ts          # Duplicate better-auth config
└── package.json                # better-auth dependency
```

**Problems:**

- Duplicate code (same auth configuration in two places)
- Duplicate dependencies (better-auth in both apps)
- Inconsistent auth behavior if configs diverge
- Harder to maintain and update

### After Refactoring

```
packages/platform-auth/         # NEW: Shared auth infrastructure
├── src/
│   ├── createAuth.ts          # Factory for better-auth instances
│   ├── authMiddleware.ts      # Shared auth middleware
│   └── index.ts               # Public API
└── package.json               # better-auth dependency (single source)

apps/trading/
├── server/lib/auth.ts         # Uses createAuth factory
└── package.json               # @abeauvois/platform-auth dependency

apps/web/
├── server/lib/auth.ts         # Uses createAuth factory
└── package.json               # @abeauvois/platform-auth dependency
```

**Benefits:**
✅ Single source of truth for auth configuration
✅ Consistent auth behavior across all apps
✅ Easier maintenance (update once, affects all apps)
✅ Better dependency management
✅ Shared user database across apps

## Shared Components

### 1. `createAuth()` Factory

Creates a configured better-auth instance with standardized settings.

```typescript
import { createAuth } from "@abeauvois/platform-auth";
import { db } from "./db/db";
import * as schema from "./db/schema";

export const auth = createAuth({
  db, // Database connection
  schema, // Drizzle schema
  provider: "pg", // Database provider
  trustedOrigins: [process.env.CLIENT_URL!], // CORS origins
});
```

**Configuration:**

- Email/password authentication enabled
- OpenAPI plugin for API documentation
- Drizzle adapter for database operations

### 2. `createAuthMiddleware()` Helper

Creates Hono middleware for protecting routes.

```typescript
import { createAuthMiddleware } from "@abeauvois/platform-auth";
import { auth } from "../lib/auth";

export const authMiddleware = createAuthMiddleware(auth);
```

**Functionality:**

- Validates session from request headers
- Returns 401 if no valid session
- Attaches `user` and `session` to Hono context
- Reusable across all apps

## Usage in Apps

### Trading App

**`apps/trading/server/lib/auth.ts`:**

```typescript
import { createAuth } from "@abeauvois/platform-auth";
import { db } from "../db/db";
import * as schema from "../db/schema";

export const auth = createAuth({
  db,
  schema,
  provider: "pg",
  trustedOrigins: [process.env.CLIENT_URL!],
});
```

**`apps/trading/server/middlewares/auth.middleware.ts`:**

```typescript
import { createAuthMiddleware } from "@abeauvois/platform-auth";
import { auth } from "../lib/auth";

export const authMiddleware = createAuthMiddleware(auth);
```

### Web App

**`apps/web/server/lib/auth.ts`:**

```typescript
import { createAuth } from "@abeauvois/platform-auth";
import { db } from "../db/db";
import * as schema from "../db/schema";

export const auth = createAuth({
  db,
  schema,
  provider: "pg",
  trustedOrigins: [process.env.CLIENT_URL!],
});
```

**`apps/web/server/middlewares/auth.middleware.ts`:**

```typescript
import { createAuthMiddleware } from "@abeauvois/platform-auth";
import { auth } from "../lib/auth";

export const authMiddleware = createAuthMiddleware(auth);
```

## Shared User Database

Both trading and web apps now use the same authentication system, which means:

1. **Single User Account**: Users can sign up once and access both apps
2. **Shared Sessions**: Authentication state is shared across apps
3. **Consistent Auth Flow**: Sign in/sign up works identically in both apps

### Database Setup

To share the same user database:

1. Update `.env` files in both apps to point to the same database:

   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/shared_platform_db
   ```

2. Run migrations in one app (they share the same schema):

   ```bash
   cd apps/web
   bun db:generate
   bun db:migrate
   ```

3. The trading app will use the same database and users table

## SDK Integration

The refactoring aligns with the existing SDK structure:

### Platform SDK

- `PlatformApiClient` provides base auth methods (signUp, signIn, signOut)
- Handles session token management
- Used as base for domain-specific SDKs

### Trading SDK

- `TradingApiClient extends PlatformApiClient`
- Inherits all auth methods from platform-sdk
- Adds trading-specific methods (orders, positions, portfolio)
- No duplicate auth dependencies needed

```typescript
// Trading SDK already extends Platform SDK correctly
export class TradingApiClient extends PlatformApiClient {
  // Inherits: signUp, signIn, signOut, authenticatedRequest
  // Adds: getOrders, createOrder, getPositions, etc.
}
```

## Migration Guide

If you need to add a new app that requires authentication:

1. **Add dependency** to the new app's `package.json`:

   ```json
   {
     "dependencies": {
       "@abeauvois/platform-auth": "workspace:*"
     }
   }
   ```

2. **Create auth instance** in `server/lib/auth.ts`:

   ```typescript
   import { createAuth } from "@abeauvois/platform-auth";
   import { db } from "../db/db";
   import * as schema from "../db/schema";

   export const auth = createAuth({
     db,
     schema,
     provider: "pg",
     trustedOrigins: [process.env.CLIENT_URL!],
   });
   ```

3. **Create auth middleware** in `server/middlewares/auth.middleware.ts`:

   ```typescript
   import { createAuthMiddleware } from "@abeauvois/platform-auth";
   import { auth } from "../lib/auth";

   export const authMiddleware = createAuthMiddleware(auth);
   ```

4. **Use in routes** as needed:

   ```typescript
   import { authMiddleware } from "../middlewares/auth.middleware";

   const protectedRoutes = new Hono()
     .use(authMiddleware)
     .get("/protected", (c) => {
       const user = c.get("user");
       return c.json({ user });
     });
   ```

## Testing

Both apps should be tested to ensure authentication works correctly:

### Trading App

```bash
cd apps/trading
bun db:up
bun db:migrate
bun run dev
```

### Web App

```bash
cd apps/web
bun db:up  # or use the same database as trading
bun db:migrate
bun run dev
```

## Maintenance

When updating auth configuration:

1. **Update `packages/platform-auth/src/createAuth.ts`** only
2. Changes automatically apply to all apps using the factory
3. No need to update individual app configurations

## Related Documentation

- [Platform SDK Refactoring](./PLATFORM_SDK_REFACTORING.md)
- [Trading SDK Setup](./TRADING_SDK_SETUP.md)
- [Ticker Endpoint Implementation](./TICKER_ENDPOINT_IMPLEMENTATION.md)

# Railway Deployment Troubleshooting Guide

This document summarizes the issues encountered deploying this Bun monorepo to Railway and their solutions.

## Issue 1: Wrong Start Command

**Symptom:**

```
$ bun run src/cli/index.ts
error: Module not found "src/cli/index.ts"
error: script "start" exited with code 1
```

**Cause:**
Railway uses Nixpacks (Railpack) by default and runs the `start` script from root `package.json`. The original start script pointed to the CLI app instead of the API server.

**Solution:**
Update root `package.json`:

```json
{
  "scripts": {
    "build": "bun run build:lib && bun run build:api",
    "build:api": "cd apps/api && bun run build",
    "start": "cd apps/api && bun run start"
  }
}
```

## Issue 2: Railway Ignoring Config Files

**Symptom:**

- `railway.toml` settings not applied
- `nixpacks.toml` settings ignored
- Railway kept using cached configuration

**Cause:**
Railway aggressively caches builds when deploying from GitHub. Config changes may not be picked up on redeploy.

**Solution:**
Use `railway up` instead of git-triggered deploys:

```bash
railway up --detach
```

This uploads directly from local filesystem, bypassing the GitHub cache.

Also see "Aggressive Build Caching" below

## Issue 3: Dockerfile Not Used

**Symptom:**
Build logs show `[railpack]` instead of Docker layer commands.

**Cause:**
Setting `builder = "dockerfile"` in `railway.toml` was ignored. Railway defaulted to Nixpacks.

**Solution:**
Instead of fighting the builder, work with Nixpacks:

1. Remove Dockerfile references from `railway.toml`
2. Configure build/start commands that work with Nixpacks:

```toml
# railway.toml
[build]
buildCommand = "bun run build"

[deploy]
startCommand = "bun run start"
healthcheckPath = "/api/health"
healthcheckTimeout = 30
```

## Issue 4: Healthcheck Path Mismatch

**Symptom:**

```
Starting Healthcheck
Path: /health
Attempt #1 failed with service unavailable
```

**Cause:**
The API's health endpoint is at `/api/health` but Railway was configured to check `/health`.

**Solution:**
Update `railway.toml`:

```toml
[deploy]
healthcheckPath = "/api/health"
```

## Issue 5: Missing DATABASE_URL

**Symptom:**
Healthcheck fails, service never becomes healthy.

**Cause:**
The API requires `DATABASE_URL` environment variable:

```typescript
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}
```

**Solution:**

1. Add PostgreSQL database in Railway dashboard
2. Connect it to the service using reference variables:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```

## Issue 6: Husky Pre-commit Hook Format

**Symptom:**

```
husky - DEPRECATED
Please remove the following two lines from .husky/pre-commit:
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
```

**Cause:**
Husky v9+ uses a new hook format without the shebang and source lines.

**Solution:**
Update `.husky/pre-commit`:

```bash
# Run type checking
echo "Running type check..."
bun --bun tsc --noEmit -p packages/platform-task/tsconfig.json || exit 1

# Run linting
echo "Running lint..."
bun run --filter dashboard lint || exit 1

# Run unit tests
echo "Running unit tests..."
bun run test:unit || exit 1
```

## Issue 6: Missing APP_ENV Variable

**Symptom:**

```
error: APP_ENV must be either "development" or "production"
```

**Cause:**
The database connection logic requires `APP_ENV` to determine the connection mode.

**Solution:**

```bash
railway variables --set "APP_ENV=production"
```

## Required Environment Variables

| Variable              | Required | Description                                               |
| --------------------- | -------- | --------------------------------------------------------- |
| `DATABASE_URL`        | Yes      | PostgreSQL connection string                              |
| `APP_ENV`             | Yes      | Must be `development` or `production`                     |
| `BETTER_AUTH_SECRET`  | Yes      | Secret for auth (generate with `openssl rand -base64 32`) |
| `PORT`                | No       | Server port (default: 3000, Railway sets automatically)   |
| `CLIENT_URL`          | No       | Dashboard URL for CORS                                    |
| `ANTHROPIC_API_KEY`   | No       | For AI enrichment features                                |
| `GMAIL_CLIENT_ID`     | No       | Gmail OAuth client ID                                     |
| `GMAIL_CLIENT_SECRET` | No       | Gmail OAuth client secret                                 |
| `GMAIL_REFRESH_TOKEN` | No       | Gmail OAuth refresh token                                 |

## Deployment Checklist

- [ ] PostgreSQL database added to Railway project
- [ ] `DATABASE_URL` variable set (use `${{Postgres.DATABASE_URL}}`)
- [ ] `APP_ENV=production` variable set
- [ ] `BETTER_AUTH_SECRET` variable set (generate with `openssl rand -base64 32`)
- [ ] `railway.toml` in repository root
- [ ] Health endpoint accessible at `/api/health`
- [ ] Build script builds the API: `bun run build:api`
- [ ] Start script runs the API: `cd apps/api && bun run start`

## Useful Commands

```bash
# Check project status
railway status

# View deploy logs
railway logs -n 50

# View build logs
railway logs -n 50 --build

# Deploy from local (bypasses cache)
railway up --detach

# Force redeploy
railway redeploy -y

# Check/set variables
railway variables --kv
railway variables --set "KEY=value"

# Open dashboard
railway open
```

## Issue 7: Workspace Dependencies with Nixpacks

**Symptom:**

```
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "workspace:": workspace:*
```

**Cause:**
Nixpacks defaults to npm for Node.js projects. npm doesn't understand `workspace:*` protocol - only Bun and pnpm support it.

**Solution:**
Use a Dockerfile instead of Nixpacks for apps with workspace dependencies:

```dockerfile
# Use Bun to handle workspace:* dependencies
FROM oven/bun:1.3.5 AS base
# ... build stages ...

# For static sites, use Caddy to serve
FROM caddy:2-alpine AS release
COPY --from=build /app/apps/my-app/dist /srv
```

Update `railway.json`:

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/my-app/Dockerfile"
  }
}
```

## Issue 8: Root railway.toml Overrides All Services

**Symptom:**

```
Container failed to start
The executable `bun` could not be found.
```

This happens when a Dockerfile-based service (e.g., using Caddy) is overridden by the root `railway.toml`'s `startCommand`.

**Cause:**
The root `railway.toml` applies to ALL services in the project. Settings like `startCommand = "bun run start"` override each service's Dockerfile CMD/ENTRYPOINT, even dashboard settings.

**Solution:**
Remove `startCommand` from root `railway.toml` and let each service use its Dockerfile's CMD/ENTRYPOINT:

```toml
# railway.toml
[build]
buildCommand = "bun run build"

[deploy]
# Do NOT set startCommand here - each service uses its Dockerfile CMD/ENTRYPOINT
healthcheckPath = "/api/health"
healthcheckTimeout = 30
```

Each service's Dockerfile should define its own start command:

- API/backend services: `CMD ["bun", "run", "./dist/index.js"]`
- Static sites with Caddy: `ENTRYPOINT ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]`

**Key insight:** Dashboard settings do NOT override `railway.toml` - the file always wins.

## Issue 9: SPA Routing with Static Sites

**Symptom:**
Direct navigation to routes like `/dashboard` or `/settings` returns 404.

**Cause:**
Static file servers don't know about client-side routing - they look for actual files at those paths.

**Solution:**
Use a Caddyfile with `try_files` fallback:

```caddyfile
:{$PORT:80} {
    root * /srv
    encode gzip

    # Fallback to index.html for SPA routing
    try_files {path} /index.html

    file_server
}
```

## Issue 10: CORS with better-auth Bypassing Hono Middleware

**Symptom:**
Browser shows CORS errors on `/api/auth/*` endpoints even though Hono CORS middleware is configured.

**Cause:**
When using `auth.handler(c.req.raw)`, better-auth returns a Response directly, bypassing Hono's middleware response processing. The CORS headers never get added.

**Solution:**
Manually wrap auth handler to add CORS headers:

```typescript
.on(['POST', 'GET', 'OPTIONS'], '/api/auth/*', async (c) => {
  const origin = c.req.header('origin');
  const allowedOrigin = isAllowedOrigin(origin ?? null);

  // Handle preflight
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin || '',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  const response = await auth.handler(c.req.raw);
  const newHeaders = new Headers(response.headers);
  if (allowedOrigin) {
    newHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
    newHeaders.set('Access-Control-Allow-Credentials', 'true');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
})
```

## Issue 11: Service Running Wrong App Code

**Symptom:**
Deploy logs show wrong start command:

```
$ cd apps/api && bun run start
```

When it should be:

```
$ cd apps/trading-server && bun run start
```

**Cause:**

1. Start command in Railway dashboard configured incorrectly
2. Root `railway.toml` settings applied to all services
3. Service-specific `railway.toml` not being picked up

**Solution:**
Set **Custom Start Command** directly in Railway dashboard (Settings → Deploy):

```
cd apps/trading-server && bun run start
```

Dashboard settings for start command override `railway.toml` when set explicitly.

## Issue 12: Module Not Found - Wrong Build Output

**Symptom:**

```
error: Module not found "./dist/index.js"
```

**Cause:**
Root `buildCommand = "bun run build"` only builds the API server, not trading-server. The start command tries to run `./dist/index.js` which doesn't exist.

**Solution:**
Update root `package.json` to build all services:

```json
{
  "scripts": {
    "build": "bun run build:lib && bun run build:api && bun run build:trading-server",
    "build:api": "cd apps/api && bun run build",
    "build:trading-server": "cd apps/trading-server && bun run build"
  }
}
```

## Issue 13: Database Migration with Internal URL

**Symptom:**

```
error: ENOTFOUND postgres.railway.internal
```

**Cause:**
`postgres.railway.internal` only resolves inside Railway's network. Running migrations locally uses this internal URL.

**Solution:**
Use public DATABASE_URL for local migrations:

```bash
# Get public URL
railway variables --service=Postgres

# Run with public URL
DATABASE_URL="postgresql://user:pass@hostname:port/railway" bun run db:migrate

# or

railway run --service=platform bun run db:migrate

# or

railway run --service=platform psql $DATABASE_URL -c "
  CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES \"user\"(id) ON DELETE CASCADE,
      theme VARCHAR(10) NOT NULL DEFAULT 'system',
      locale VARCHAR(10) NOT NULL DEFAULT 'en',
      trading_account_mode VARCHAR(10) DEFAULT 'spot',
      trading_reference_timestamp BIGINT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );
  "
```

Or use Railway's database proxy:

```bash
railway connect Postgres
# Then in another terminal, use localhost with the proxy port
```

## Issue 14: Aggressive Build Caching

**Symptom:**
Code changes not reflected after deployment. Build logs show "cached" for all steps including `bun run build`.

**Solution:**
Set `NO_CACHE=1` environment variable:

```bash
railway variables --set "NO_CACHE=1" --service=trading-server
railway redeploy --service=trading-server --yes
```

After successful deployment, clean up:

```bash
railway variables --unset "NO_CACHE" --service=trading-server
```

## Issue 15: Binance API IP Whitelist with Dynamic IPs

**Symptom:**

```
error: Binance API error: 400 - Invalid API-key, IP, or permissions for action.
```

**Cause:**
Railway uses dynamic IPs that change with each deployment. Whitelisted IPs become invalid after redeployment.

**Solutions:**

1. **Use unrestricted API key** (not possible for all endpoints):
   - Binance → API Management → Edit restrictions
   - Remove IP restriction
   - Limit to read-only permissions for security

2. **Railway Static IPs** (paid feature - Pro Plan):
   - Check Settings → Networking for static IP options

3. **Check current IP** (temporary):
   ```bash
   railway run --service=trading-server curl -s ifconfig.me
   ```

## Issue 16: Neon Serverless Driver with Railway PostgreSQL

**Symptom:**

```
NeonDbError: Error connecting to database: Error: Unable to connect. Is the computer able to access the url?
  path: "https://api.proxy.rlwy.net/sql",
  code: "ConnectionRefused"
```

**Cause:**
The database connection code was configured to use Neon's serverless HTTP driver in production mode (`APP_ENV=production`). Railway uses standard PostgreSQL, not Neon, so the Neon HTTP protocol doesn't work.

**Solution:**
Use `node-postgres` (Pool) for Railway PostgreSQL instead of Neon's serverless driver:

```typescript
// packages/platform-db/src/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

const getDbConn = () => {
  if (!process.env.DATABASE_URL)
    throw new Error("No database connection string specified.");

  // Use node-postgres Pool for both development and production
  // Works with Railway PostgreSQL and any standard PostgreSQL database
  return drizzle(pool);
};

export const db = getDbConn();
```

Also remove unused Neon dependencies from package.json files:

- `@neondatabase/serverless`
- `ws`

## Issue 17: Cross-Service Authentication (401 on Trading Server)

**Symptom:**

```
GET /api/trading/watchlist 401
Authentication failed. Please sign in again.
```

User is logged in (can access platform API) but trading-server returns 401.

**Cause:**
Platform API and trading-server are on different domains. Session cookies set by platform don't get sent to trading-server because:

1. Cookies are domain-specific (can't be shared across different origins)
2. Even with `SameSite=None`, cookies only work when the **same server** sets and receives them
3. Public suffix domains (like `*.up.railway.app`) may block cross-origin cookies entirely

**Solution:**
Use **bearer tokens** for cross-service authentication:

1. **Platform API** issues bearer tokens (via better-auth bearer plugin)
2. **Client** captures token from `set-auth-token` response header after sign-in
3. **Client** sends `Authorization: Bearer <token>` to trading-server
4. **Trading-server** validates token using shared `BETTER_AUTH_SECRET`

**Implementation:**

1. Add bearer plugin to `@abeauvois/platform-auth`:

```typescript
import { bearer } from "better-auth/plugins";

plugins: [bearer()];
```

2. Client captures token on sign-in:

```typescript
const authClient = createAuthClient({
  fetchOptions: {
    onSuccess: (ctx) => {
      const token = ctx.response.headers.get("set-auth-token");
      if (token) localStorage.setItem("auth_token", token);
    },
  },
});
```

3. SDK sends bearer token:

```typescript
const tradingClient = new TradingApiClient({
  baseUrl: "https://trading-server.example.com",
  getToken: () => localStorage.getItem("auth_token"),
});
```

**Key requirement:** Both platform and trading-server must have the **same `BETTER_AUTH_SECRET`** environment variable to validate tokens.

## Service Configuration Reference

| Service        | Start Command                             | Build Command   | Healthcheck   |
| -------------- | ----------------------------------------- | --------------- | ------------- |
| platform       | `cd apps/api && bun run start`            | `bun run build` | `/api/health` |
| trading-server | `cd apps/trading-server && bun run start` | `bun run build` | `/api/health` |
| trading-client | Dockerfile ENTRYPOINT (Caddy)             | Dockerfile      | N/A           |

## Required Environment Variables by Service

### platform

| Variable             | Required | Description                   |
| -------------------- | -------- | ----------------------------- |
| `DATABASE_URL`       | Yes      | PostgreSQL connection string  |
| `APP_ENV`            | Yes      | `development` or `production` |
| `BETTER_AUTH_SECRET` | Yes      | Auth signing secret           |
| `TRADING_CLIENT_URL` | Yes      | For CORS                      |
| `DASHBOARD_URL`      | No       | For CORS                      |

### trading-server

| Variable             | Required | Description                                |
| -------------------- | -------- | ------------------------------------------ |
| `DATABASE_URL`       | Yes      | PostgreSQL connection string               |
| `BINANCE_API_KEY`    | Yes      | Binance API key (unrestricted recommended) |
| `BINANCE_API_SECRET` | Yes      | Binance API secret                         |
| `TRADING_CLIENT_URL` | Yes      | For CORS                                   |
| `API_URL`            | No       | Platform API URL                           |

## File Structure

```
/
├── railway.toml          # Railway configuration (applies to all services)
├── package.json          # Root package with build/start scripts
└── apps/
    ├── api/
    │   ├── Dockerfile    # CMD ["bun", "run", "./dist/index.js"]
    │   └── railway.json  # Service-specific build config
    ├── trading-server/
    │   ├── railway.toml  # Service-specific config (may be overridden)
    │   └── Dockerfile
    └── trading-client/
        ├── Dockerfile    # ENTRYPOINT for Caddy
        ├── Caddyfile     # SPA routing configuration
        └── railway.json  # builder: DOCKERFILE
```

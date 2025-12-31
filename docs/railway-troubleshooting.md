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
  throw new Error('DATABASE_URL environment variable is required');
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

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `APP_ENV` | Yes | Must be `development` or `production` |
| `BETTER_AUTH_SECRET` | Yes | Secret for auth (generate with `openssl rand -base64 32`) |
| `PORT` | No | Server port (default: 3000, Railway sets automatically) |
| `CLIENT_URL` | No | Dashboard URL for CORS |
| `ANTHROPIC_API_KEY` | No | For AI enrichment features |
| `GMAIL_CLIENT_ID` | No | Gmail OAuth client ID |
| `GMAIL_CLIENT_SECRET` | No | Gmail OAuth client secret |
| `GMAIL_REFRESH_TOKEN` | No | Gmail OAuth refresh token |

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

## File Structure

```
/
├── railway.toml          # Railway configuration
├── nixpacks.toml         # Nixpacks build hints (optional)
├── package.json          # Root package with build/start scripts
└── apps/
    └── api/
        ├── railway.json  # Service-specific config (optional)
        └── server/
            └── index.ts  # API entry point with /api/health endpoint
```

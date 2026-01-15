# Railway Deployment Guide

This guide covers deploying the trading server and trading client to Railway.

## Overview

The trading platform consists of two Railway services:

| Service | Type | Build | Port |
|---------|------|-------|------|
| **trading-server** | Backend API | Dockerfile | 3001 |
| **trading-client** | Static SPA | Dockerfile + Caddy | 80 |

Both services share the same PostgreSQL database as the main API server for session authentication.

## Prerequisites

1. **Railway CLI** installed:
   ```bash
   curl -fsSL https://railway.app/install.sh | sh
   ```

2. **Railway account** linked to project:
   ```bash
   railway login
   railway link
   ```

3. **GitHub secrets** configured (for CI/CD):
   - `RAILWAY_TOKEN`
   - Service IDs for each app/environment

## Services

### Trading Server (Docker)

**Build method:** Dockerfile at `apps/trading-server/Dockerfile`

The trading server is a Hono API that:
- Proxies Binance API calls (handles authentication, rate limiting)
- Validates user sessions via shared PostgreSQL database
- Exposes OpenAPI documentation at `/api/docs`

**Railway configuration** (`apps/trading-server/railway.json`):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/trading-server/Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Health endpoint:** `GET /health` returns:
```json
{ "status": "ok", "timestamp": "2024-01-15T12:00:00.000Z" }
```

### Trading Client (Static Site)

**Build method:** Dockerfile with Caddy server

The trading client is a React SPA built with Vite that:
- Connects to trading-server for market data and orders
- Connects to API server for authentication (better-auth)
- Uses TanStack Query for server state management

**Railway configuration** (`apps/trading-client/railway.json`):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/trading-client/Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/",
    "healthcheckTimeout": 30
  }
}
```

**Note:** Uses Dockerfile instead of Nixpacks because the app has `workspace:*` dependencies that require Bun (npm doesn't support this protocol). Caddy serves the static files with proper SPA routing.

## Environment Variables

### Trading Server

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (use `${{Postgres.DATABASE_URL}}`) |
| `APP_ENV` | Yes | Set to `production` |
| `BETTER_AUTH_SECRET` | Yes | Must match API server (generate: `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Yes | API server URL for auth |
| `TRADING_SERVER_URL` | Yes | This service's public URL |
| `TRADING_CLIENT_URL` | Yes | Trading client URL (for CORS) |
| `API_URL` | Yes | API server URL (for CORS) |
| `CLIENT_URLS` | No | Additional allowed origins (comma-separated) |
| `BINANCE_API_KEY` | No* | Binance API key for authenticated routes |
| `BINANCE_API_SECRET` | No* | Binance API secret for authenticated routes |

*Without Binance credentials, balance/order endpoints will be disabled.

### Trading Client (Build-time)

These are Vite environment variables set during build:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_TRADING_API_URL` | Yes | Trading server URL (e.g., `https://trading.up.railway.app`) |
| `VITE_AUTH_API_URL` | Yes | API server URL for authentication |

## Deployment Steps

### Initial Setup

#### 1. Create Services in Railway Dashboard

1. Go to your Railway project
2. Click **New Service** > **Empty Service**
3. Name it `trading-server`
4. Repeat for `trading-client`

#### 2. Connect Repository

For each service:
1. Go to **Settings** > **Source**
2. Connect to your GitHub repository
3. Set the **Root Directory**:
   - trading-server: Leave empty (Dockerfile path is configured)
   - trading-client: `apps/trading-client`

#### 3. Configure Environment Variables

**Trading Server:**
```bash
railway service trading-server

# Required
railway variables --set "DATABASE_URL=\${{Postgres.DATABASE_URL}}"
railway variables --set "APP_ENV=production"
railway variables --set "BETTER_AUTH_SECRET=your-secret-here"
railway variables --set "BETTER_AUTH_URL=https://your-api.up.railway.app"
railway variables --set "TRADING_SERVER_URL=https://trading-server.up.railway.app"
railway variables --set "TRADING_CLIENT_URL=https://trading-client.up.railway.app"
railway variables --set "API_URL=https://your-api.up.railway.app"

# Optional (for authenticated trading)
railway variables --set "BINANCE_API_KEY=your-key"
railway variables --set "BINANCE_API_SECRET=your-secret"
```

**Trading Client:**
```bash
railway service trading-client

railway variables --set "VITE_TRADING_API_URL=https://trading-server.up.railway.app"
railway variables --set "VITE_AUTH_API_URL=https://your-api.up.railway.app"
```

#### 4. Deploy

```bash
# Deploy trading server
cd apps/trading-server
railway up --detach

# Deploy trading client
cd apps/trading-client
railway up --detach
```

### CI/CD Deployment

The GitHub Actions workflow at `.github/workflows/deploy.yml` handles automated deployments.

**Triggers:**
- **Release published:** Deploys `trading` to production
- **Manual dispatch:** Deploy any app to staging or production

**Required GitHub Secrets:**

| Secret | Description |
|--------|-------------|
| `RAILWAY_TOKEN` | Railway API token |
| `RAILWAY_TRADING_PROD_SERVICE_ID` | Trading server production service ID |
| `RAILWAY_TRADING_STAGING_SERVICE_ID` | Trading server staging service ID |
| `RAILWAY_TRADING_CLIENT_PROD_SERVICE_ID` | Trading client production service ID |
| `RAILWAY_TRADING_CLIENT_STAGING_SERVICE_ID` | Trading client staging service ID |

**Getting Service IDs:**
```bash
railway service trading-server
railway status  # Shows service ID
```

**Manual deployment:**
1. Go to **Actions** > **Deploy**
2. Click **Run workflow**
3. Select app and environment

## Post-Deployment

### CORS Configuration

After deploying, update the trading server's CORS settings with the actual Railway URLs:

```bash
railway service trading-server
railway variables --set "TRADING_CLIENT_URL=https://actual-trading-client-url.railway.app"
railway variables --set "API_URL=https://actual-api-url.railway.app"
railway redeploy -y
```

### Binance API IP Whitelist

**IMPORTANT:** If using authenticated Binance routes (balance, orders), you must whitelist Railway's egress IP.

1. Get Railway's IP address:
   ```bash
   railway service trading-server
   railway logs | grep -i "ip\|address"
   # Or check Railway dashboard for egress IP
   ```

2. Add IP to Binance API whitelist:
   - Go to [Binance API Management](https://www.binance.com/en/my/settings/api-management)
   - Edit your API key
   - Add Railway's IP to **IP access restrictions**

Without this step, Binance API calls will fail with "IP not in whitelist" errors.

## Verification

### Health Check

```bash
curl https://trading-server.up.railway.app/health
# Expected: {"status":"ok","timestamp":"..."}
```

### API Documentation

Open in browser:
```
https://trading-server.up.railway.app/api/docs
```

### Test Public Endpoints

```bash
# Get ticker
curl https://trading-server.up.railway.app/api/trading/ticker?symbol=BTCUSDT

# Get symbols
curl https://trading-server.up.railway.app/api/trading/symbols
```

### Test Client

Open the trading client URL in browser and verify:
- Page loads without errors
- Login redirects to API server
- Market data loads after authentication

## Troubleshooting

### Common Issues

**Build fails with "lockfile had changes":**
- Ensure all workspace `package.json` files are listed in Dockerfile
- Run `bun install` locally and commit updated `bun.lock`

**Healthcheck fails:**
- Verify `/health` endpoint returns 200
- Check logs: `railway logs -n 100`
- Ensure `DATABASE_URL` is set correctly

**CORS errors in browser:**
- Verify `TRADING_CLIENT_URL` matches actual client URL
- Check for trailing slashes mismatch
- Add URL to `CLIENT_URLS` if using custom domain

**Binance API errors:**
- Verify API key/secret are correct
- Check IP whitelist (see above)
- Ensure system time is synchronized

**Auth fails on trading client:**
- Verify `VITE_AUTH_API_URL` points to API server
- Check `BETTER_AUTH_SECRET` matches API server
- Ensure cookies are being sent (credentials: 'include')

### Useful Commands

```bash
# View logs
railway logs -n 100

# View build logs
railway logs -n 100 --build

# Check variables
railway variables --kv

# Force redeploy
railway redeploy -y

# Open dashboard
railway open

# Deploy bypassing cache
railway up --detach
```

### Rollback

For production deployments, the workflow automatically attempts rollback on failure.

Manual rollback:
```bash
railway service trading-server
railway rollback
```

Or redeploy from a specific commit via Railway dashboard.

## Architecture Notes

### Why Server-Side Binance Calls?

The trading server proxies Binance API calls rather than calling directly from the client:

1. **Security:** API keys never exposed to browser
2. **IP Whitelisting:** Binance restricts by IP; Railway has stable egress
3. **Rate Limiting:** Server can manage and distribute rate limits
4. **CORS:** Binance API doesn't allow browser requests

### Session Sharing

Both trading-server and API server validate sessions against the same PostgreSQL database:
- Uses `better-auth` for session management
- `BETTER_AUTH_SECRET` must match across services
- Sessions are stored in shared database

### Static vs Server Rendering

The trading client is a pure SPA (no SSR):
- Built with Vite, outputs static files
- Railway serves from `dist/` directory
- All API calls made client-side after load

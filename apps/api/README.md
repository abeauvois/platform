# Platform API Server

Central platform server handling authentication, todos, bookmarks, configuration, and shared features.

## Architecture

This is the **central API server** that all client apps connect to for shared functionality:

- Authentication (via `@abeauvois/platform-auth`)
- Todo management
- Bookmark management
- Configuration management (single source of truth for API keys and tokens)

## API Endpoints

| Route | Method | Purpose | Auth Required |
|-------|--------|---------|---------------|
| `/api/auth/**` | POST/GET | Authentication (sign-up, sign-in, sign-out) | Varies |
| `/api/todos` | GET/POST/PATCH/DELETE | Todo management | Yes |
| `/api/bookmarks` | GET/POST/PATCH/DELETE | Bookmark management | Yes |
| `/api/config` | GET | Get all configuration values | Yes |
| `/api/config/:key` | GET | Get specific config value | Yes |
| `/api/config/batch` | POST | Get multiple config values | Yes |
| `/api/config/keys` | GET | List available config keys | Yes |

## Development

```bash
# From monorepo root
bun run api

# Or from this directory
bun run dev
```

Server runs on **port 3000**.

## Database

```bash
# Start PostgreSQL via Docker
bun run db:up

# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Open Drizzle Studio
bun run db:studio
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/platform_db

# CORS
CLIENT_URLS=http://localhost:5000,http://localhost:5001

# Configuration values served to authenticated clients via /api/config
ANTHROPIC_API_KEY=your_anthropic_key
NOTION_INTEGRATION_TOKEN=your_notion_token
NOTION_DATABASE_ID=your_database_id
TWITTER_BEARER_TOKEN=your_twitter_token
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
MY_EMAIL_ADDRESS=your_email@example.com
```

## Client Apps

The following clients connect to this server:

- **Dashboard** (`/apps/dashboard`) - port 5000
- **Trading Client** (`/apps/trading/client`) - port 5001 (for auth and shared features)

# @platform/db

Centralized database package for the platform monorepo. Contains all shared table schemas, migrations, and database connection logic.

## Structure

```
packages/platform-db/
├── src/
│   ├── schema/
│   │   ├── auth.ts      # Authentication tables (user, session, account, verification)
│   │   ├── api.ts       # Application tables (todos, bookmarks, tasks)
│   │   ├── trading.ts   # Trading tables (watchlist, settings)
│   │   └── index.ts     # Re-exports all schemas
│   ├── db.ts            # Database connection (node-postgres Pool)
│   └── index.ts         # Package exports
├── migrations/          # SQL migration files
└── drizzle.config.ts    # Drizzle Kit configuration
```

## Usage

### Importing Tables

```typescript
import { user, session, bookmarks, watchlistItems } from '@platform/db';
// or
import * as schema from '@platform/db/schema';
```

### Importing Database Connection

```typescript
import { db, pool, eq } from '@platform/db';

// Query example
const users = await db.select().from(user).where(eq(user.id, userId));
```

### Using Query Operators

The package re-exports common Drizzle operators for convenience:

```typescript
import { db, eq, desc, and, or, sql, asc, ne, gt, gte, lt, lte, isNull, isNotNull, inArray } from '@platform/db';

// Complex queries
const results = await db
  .select()
  .from(bookmarks)
  .where(and(
    eq(bookmarks.userId, userId),
    gt(bookmarks.createdAt, startDate)
  ))
  .orderBy(desc(bookmarks.createdAt));
```

## Database Connection

Uses **node-postgres (pg)** Pool for both development and production:

```typescript
// db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);
```

**Note:** Previously used Neon serverless driver for production, but this was removed for compatibility with Railway PostgreSQL and other standard PostgreSQL providers.

## Database Commands

Run from the repository root:

```bash
# Start PostgreSQL container
bun run db:up

# Stop PostgreSQL container
bun run db:down

# Generate migrations (after schema changes)
bun run db:generate

# Apply migrations
bun run db:migrate

# Open Drizzle Studio (visual database browser)
bun run db:studio
```

## Environment Variables

Required in each app's `.env`:

```env
DATABASE_URL=postgresql://platform:platform@localhost:5432/platform
APP_ENV=development  # or 'production'
```

## Tables

### Authentication (managed by better-auth)

| Table | Description |
|-------|-------------|
| `user` | User accounts |
| `session` | Active sessions |
| `account` | OAuth/credential accounts |
| `verification` | Email verification tokens |

### Platform Application

| Table | Description |
|-------|-------------|
| `bookmarks` | User bookmarks with enrichment data |
| `pendingContent` | Content awaiting processing |
| `backgroundTasks` | Background job tracking |

### Trading Application

| Table | Description |
|-------|-------------|
| `watchlistItems` | User watchlist items |
| `userTradingSettings` | User trading preferences |

## Adding New Tables

1. Create or update a schema file in `src/schema/`
2. Export from `src/schema/index.ts`
3. Run `bun run db:generate` to create migration
4. Run `bun run db:migrate` to apply

## Docker (Development)

The database runs in a Docker container defined in the root `docker-compose.yml`:

- **Container**: `platform-db`
- **Port**: `5432`
- **Database**: `platform`
- **User**: `platform`
- **Password**: `platform`

## Production (Railway)

For Railway deployments:
- Uses Railway-provided PostgreSQL with standard connection string
- Supports both internal (`postgres.railway.internal`) and public URLs
- Internal URL only works within Railway's network

See [railway-troubleshooting.md](../../docs/railway-troubleshooting.md) for deployment details.

# @platform/db

Centralized database package for the platform monorepo. Contains all shared table schemas, migrations, and database connection logic.

## Structure

```
packages/platform-db/
├── src/
│   ├── schema/
│   │   ├── auth.ts      # Authentication tables (user, session, account, verification)
│   │   ├── api.ts       # Application tables (todos, ingestJobs)
│   │   └── index.ts     # Re-exports all schemas
│   ├── db.ts            # Database connection (dev: pg Pool, prod: Neon)
│   └── index.ts         # Package exports
├── migrations/          # SQL migration files
└── drizzle.config.ts    # Drizzle Kit configuration
```

## Usage

### Importing Tables

```typescript
import { user, session, todos, ingestJobs } from '@platform/db';
// or
import * as schema from '@platform/db/schema';
```

### Importing Database Connection

```typescript
import { db, pool } from '@platform/db';

// Query example
const users = await db.select().from(user);
```

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
APP_ENV=development  # or 'production' for Neon serverless
```

## Tables

### Authentication (managed by better-auth)

| Table | Description |
|-------|-------------|
| `user` | User accounts |
| `session` | Active sessions |
| `account` | OAuth/credential accounts |
| `verification` | Email verification tokens |

### Application

| Table | Description |
|-------|-------------|
| `todos` | Shared todo items across apps |
| `ingest_jobs` | Background job tracking for ingestion workflows |

## Adding New Tables

1. Create or update a schema file in `src/schema/`
2. Export from `src/schema/index.ts`
3. Run `bun run db:generate` to create migration
4. Run `bun run db:migrate` to apply

## Docker

The database runs in a Docker container defined in the root `docker-compose.yml`:

- **Container**: `platform-db`
- **Port**: `5432`
- **Database**: `platform`
- **User**: `platform`
- **Password**: `platform`

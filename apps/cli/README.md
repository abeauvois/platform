# Platform CLI

Command-line interface for the platform, providing bookmark management, data ingestion, and source reader workflows.

## Structure

```
apps/cli/
├── index.ts              # CLI entry point
├── commands/             # Command definitions
│   ├── personal.ts       # Personal namespace
│   ├── bookmark.ts       # Bookmark management
│   ├── list/             # List commands
│   │   ├── index.ts      # List namespace
│   │   ├── source.ts     # Source management
│   │   └── gmail.ts      # Gmail ingestion workflow
│   ├── list.ts           # List bookmarks from API
│   ├── extract.ts        # Extract data from sources
│   └── select.ts         # Interactive selection
├── lib/                  # Shared utilities
├── tests/                # Integration tests
└── data/                 # Local data storage
```

## Dependencies

- `@platform/sdk` - Platform SDK for API communication (Auth, Fetcher, ConfigProvider)
- `@platform/domain` - Domain entities
- `cleye` - CLI framework
- `@poppinss/cliui` - Terminal UI

## Usage

```bash
# From root directory
bun run cli

# Development mode with watch
bun run cli:dev

# Direct execution
bun run apps/cli/index.ts <command>
```

### Commands

```bash
# List bookmarks
bun run cli personal bookmark list

# Direct Gmail read (synchronous, no workflow/task)
bun run cli list source gmail --filter=user@example.com --limit-days=7 --with-url

# Gmail read with defaults (7 days, no URL filter)
bun run cli list source gmail

# Trigger Gmail ingestion workflow (async, with analysis)
bun run cli ingest gmail --filter=user@example.com --limit-days=7
```

### Gmail Commands

Two ways to read Gmail:

| Command | Pattern | Use Case |
|---------|---------|----------|
| `list source gmail` | Direct (sync) | Quick reads, returns raw content immediately |
| `ingest gmail` | Task-based (async) | Full workflow with analysis/enrichment steps |

**Direct read flags:**
- `--filter`, `-f` - Filter by sender email address
- `--limit-days`, `-l` - Limit to emails from last N days (default: 7)
- `--with-url`, `-u` - Only include emails containing URLs

## Configuration

The CLI fetches configuration from the API server at `http://localhost:3000`.

Override with environment variable:

```bash
PLATFORM_API_URL=http://localhost:4000 bun run cli personal bookmark list
```

## Authentication

The CLI manages authentication automatically:

1. Checks for existing session in `~/.platform-cli/session.json`
2. If no session, prompts for email/password
3. Authenticates with API server
4. Stores session token for future use

### Session Management

Sessions are stored in `~/.platform-cli/session.json`:

```json
{
  "sessionToken": "token-here",
  "userId": "user-id",
  "email": "user@example.com"
}
```

To clear session (logout):

```bash
rm ~/.platform-cli/session.json
```

To renew an expired session:

```bash
# From root directory
bun run api:renew-session your@email.com yourpassword

# Or with environment variables
export PLATFORM_EMAIL="your@email.com"
export PLATFORM_PASSWORD="yourpassword"
bun run api:renew-session
```

## Development

### Prerequisites

1. Start the API server:

   ```bash
   bun run api
   ```

2. Create a test user via the dashboard at http://localhost:5000

### Adding New Commands

1. Create command file in `apps/cli/commands/`
2. Import and add to parent command
3. Use Platform SDK for API operations:

```typescript
import { Auth, Fetcher } from "@platform/sdk";

const auth = new Auth({ baseUrl: API_URL });
const credentials = await auth.login();
const fetcher = new Fetcher({ baseUrl: API_URL, credentials });
const bookmarks = await fetcher.fetchBookmarks();
```

## Building

```bash
# Build from root
bun run build

# Or build CLI independently
cd apps/cli
bun run build
```

## Troubleshooting

### "Cannot find module '@platform/sdk'"

Build the packages:

```bash
bun run build:lib
```

### "Authentication failed" or 401 Unauthorized

1. Check API server is running on http://localhost:3000
2. Verify user exists with correct credentials
3. Renew session: `bun run api:renew-session your@email.com password`
4. Or clear session file: `rm ~/.platform-cli/session.json`

## Testing

Run integration tests (requires API server running):

```bash
bun test ./apps/cli/tests/integration/gmail-source.test.ts
```

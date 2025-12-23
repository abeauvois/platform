# Platform CLI

Command-line interface for the platform, providing bookmark management, data ingestion, and Notion integration.

## Structure

```
apps/cli/
├── index.ts              # CLI entry point
├── commands/             # Command definitions
│   ├── personal.ts       # Personal namespace
│   ├── bookmark.ts       # Bookmark management
│   ├── list.ts           # List bookmarks from API
│   ├── ingest.ts         # Ingest bookmarks from sources
│   ├── extract.ts        # Extract data from sources
│   ├── notion.ts         # Notion integration
│   └── select.ts         # Interactive selection
├── lib/                  # Shared utilities
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

# Ingest from Gmail
bun run cli personal bookmark ingest -f gmail

# Ingest with output format
bun run cli personal bookmark ingest -f gmail -t csv
```

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

### "Authentication failed"

1. Check API server is running on http://localhost:3000
2. Verify user exists with correct credentials
3. Clear session file: `rm ~/.platform-cli/session.json`

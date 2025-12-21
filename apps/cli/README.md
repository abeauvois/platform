# Platform CLI

Independent CLI application for managing personal bookmarks via the platform API.

## Architecture

Built using hexagonal architecture with the Platform SDK:

```
apps/cli/
├── index.ts              # CLI entry point
├── commands/             # Command definitions
│   ├── personal.ts       # Personal namespace
│   ├── bookmark.ts       # Bookmark management
│   ├── list.ts          # List bookmarks from API
│   └── ingest.ts        # Ingest bookmarks from sources
└── package.json         # Independent package
```

## Dependencies

- `@platform/sdk` - Platform SDK for API communication (includes Auth, Fetcher, Logger)
- `@platform/domain` - Domain entities (Bookmark)
- `cleye` - CLI framework
- `@poppinss/cliui` - Terminal UI

## Building

```bash
# Build from root
bun run build:sdk

# Or build CLI independently
cd apps/cli
bun run build
```

## Usage

### List Bookmarks

Fetch and display bookmarks from the platform API:

```bash
# from apps/cli
bun dev personal bookmark ingest -f gmail -t csv

# From root
bun run platform personal bookmark list

# Direct execution
bun run apps/cli/index.ts personal bookmark list
```

#### Authentication

The CLI will:

1. Check for existing session in `~/.platform-cli/session.json`
2. If no session, prompt for email/password
3. Authenticate with API at `http://localhost:3000/api/auth/sign-in/email`
4. Store session token for future use

#### API Connection

Default API URL: `http://localhost:3000`

Override with environment variable:

```bash
PLATFORM_API_URL=http://localhost:4000 bun run platform personal bookmark list
```

## Testing

### Prerequisites

1. **Start the web server:**

   ```bash
   cd apps/web
   bun run dev
   ```

2. **Create a test user:**
   You can use the web UI at http://localhost:3000 or curl:

   ```bash
   curl -X POST http://localhost:3000/api/auth/sign-up/email \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
   ```

3. **Add some bookmarks via API:**

   ```bash
   # First, sign in to get session
   curl -X POST http://localhost:3000/api/auth/sign-in/email \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}' \
     -c cookies.txt

   # Add a bookmark
   curl -X POST http://localhost:3000/api/bookmarks \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{
       "url":"https://github.com/oven-sh/bun",
       "sourceAdapter":"Other",
       "tags":["bun","javascript"],
       "summary":"Bun is a fast JavaScript runtime"
     }'
   ```

### Running the Test

```bash
# From root directory
bun run platform personal bookmark list
```

Expected flow:

1. Prompts for email (if no session)
2. Prompts for password (hidden input)
3. Authenticates with API
4. Fetches bookmarks
5. Displays table of bookmarks

Example output:

```
🚀 Personal Bookmark Listing

📥 Source: gmail

✔ Authentication successful!
✔ Fetching bookmarks from API...

✔ Found 1 bookmarks:

┌─────────┬──────────────────────────────────┬───────────────────┬──────────────────────┬────────────┐
│ (index) │ url                              │ tags              │ summary              │ source     │
├─────────┼──────────────────────────────────┼───────────────────┼──────────────────────┼────────────┤
│ 0       │ 'https://github.com/oven-sh/bun' │ 'bun, javascript' │ 'Bun is a fast Java…'│ 'Other'    │
└─────────┴──────────────────────────────────┴───────────────────┴──────────────────────┴────────────┘

✨ All done!
```

## Session Management

Sessions are stored in `~/.platform-cli/session.json`:

```json
{
  "sessionToken": "token-here",
  "userId": "user-id",
  "email": "test@example.com"
}
```

To clear session (logout):

```bash
rm ~/.platform-cli/session.json
```

## Development

### Adding New Commands

1. Create command file in `apps/cli/commands/`
2. Import and add to parent command
3. Use Platform SDK for API operations:

```typescript
import { CliuiLogger, Auth, Fetcher } from "@platform/sdk";

const logger = new CliuiLogger();
const auth = new Auth({ baseUrl: API_URL, logger });
const credentials = await auth.login();
const fetcher = new Fetcher({ baseUrl: API_URL, credentials, logger });
const bookmarks = await fetcher.fetchBookmarks();
```

## Troubleshooting

### "Cannot find module '@platform/sdk'"

Build the SDK:

```bash
cd packages/platform-sdk
bun run build
```

### "Authentication failed"

1. Check web server is running on http://localhost:3000
2. Verify user exists with correct credentials
3. Clear session file: `rm ~/.platform-cli/session.json`

### "No bookmarks found"

Add bookmarks via the web UI or API (see Testing section above)

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
│   ├── worktree/         # Git worktree management
│   │   ├── index.ts      # Worktree namespace
│   │   ├── create-worktree.ts
│   │   ├── list-worktree.ts
│   │   ├── remove-worktree.ts
│   │   ├── pr/           # GitHub PR commands
│   │   │   ├── index.ts
│   │   │   ├── pr-list.ts
│   │   │   ├── pr-create.ts
│   │   │   ├── pr-checkout.ts
│   │   │   ├── pr-status.ts
│   │   │   └── pr-sync.ts
│   │   └── lib/          # Worktree utilities
│   │       ├── types.ts
│   │       ├── git-worktree.ts
│   │       ├── github-pr.ts
│   │       ├── env-manager.ts
│   │       ├── port-calculator.ts
│   │       └── warp-launcher.ts
│   ├── list.ts           # List bookmarks from API
│   ├── extract.ts        # Extract data from sources
│   └── select.ts         # Interactive selection
├── lib/                  # Shared utilities
├── tests/                # Integration tests
└── data/                 # Local data storage
```

## Dependencies

- `@abeauvois/platform-sdk` - Platform SDK for API communication (Auth, Fetcher, ConfigProvider)
- `@abeauvois/platform-domain` - Domain entities
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

### Worktree Commands

Manage git worktrees for parallel development with automatic port offset configuration.

```bash
# Create a new worktree with port offset 100
bun run cli worktree create feature-auth 100

# Create worktree without opening Warp
bun run cli worktree create bugfix-login 200 --no-open

# Create worktree without running bun install
bun run cli worktree create feature-x 300 --no-install

# List all worktrees
bun run cli worktree list

# Remove a worktree
bun run cli worktree remove feature-auth

# Remove worktree and delete the branch
bun run cli worktree remove feature-auth --delete-branch
```

**Port offset scheme:**

Each worktree uses offset ports to avoid conflicts with the main platform:

| Offset | API  | Dashboard | Trading Server | Trading Client |
|--------|------|-----------|----------------|----------------|
| 0      | 3000 | 5000      | 3001           | 5001           |
| 100    | 3100 | 5100      | 3101           | 5101           |
| 200    | 3200 | 5200      | 3201           | 5201           |

**Create command flags:**
- `--open`, `-o` - Open Warp terminal tabs after creation (default: true)
- `--install`, `-i` - Run `bun install` after creation (default: true)

**Remove command flags:**
- `--delete-branch`, `-d` - Also delete the git branch
- `--force`, `-f` - Force removal even with uncommitted changes (default: true)

**Warp integration:**

When creating a worktree, a Warp launch configuration is automatically generated. To start all dev servers:

1. Press `CMD+CTRL+L` to open Launch Configurations in Warp
2. Search for `platform-<branch-name>`
3. Press Enter to launch all services with correct port offsets

### Worktree PR Commands

Manage GitHub PRs for worktrees. Requires [GitHub CLI](https://cli.github.com/) (`gh`) to be installed and authenticated.

```bash
# List PRs with associated worktrees
bun run cli worktree pr list
bun run cli worktree pr list --all           # All open PRs (for finding PRs to checkout)
bun run cli worktree pr list --all --author @me  # Your open PRs

# Create a PR from current worktree branch
bun run cli worktree pr create
bun run cli worktree pr create --title "Add feature" --body "Description" --draft

# Checkout an existing PR into a new worktree
bun run cli worktree pr checkout 123        # PR #123 with default ports
bun run cli worktree pr checkout 123 100    # PR #123 with port offset 100

# Show PR status for current branch
bun run cli worktree pr status
bun run cli worktree pr status feature-branch --checks

# Sync worktree with base branch
bun run cli worktree pr sync              # Rebase by default
bun run cli worktree pr sync --merge      # Use merge instead
bun run cli worktree pr sync --push       # Push after sync
```

**PR List flags:**
- `--all` - Show all open PRs (default shows only PRs with worktrees)
- `--author`, `-a` - Filter by author (use `@me` for your PRs)
- `--limit`, `-l` - Maximum PRs to show (default: 50)

**PR Create flags:**
- `--title`, `-t` - PR title (prompts if not provided)
- `--body`, `-b` - PR description
- `--draft`, `-d` - Create as draft PR
- `--base` - Base branch (default: main)

**PR Checkout flags:**
- `--open`, `-o` - Open Warp terminal tabs (default: true)
- `--install`, `-i` - Run `bun install` (default: true)

**PR Status flags:**
- `--checks`, `-c` - Show detailed CI check results

**PR Sync flags:**
- `--rebase`, `-r` - Use rebase strategy (default)
- `--merge`, `-m` - Use merge strategy
- `--push`, `-p` - Push after successful sync
- `--base`, `-b` - Base branch to sync with (auto-detected from PR)

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
import { Auth, Fetcher } from "@abeauvois/platform-sdk";

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

### "Cannot find module '@abeauvois/platform-sdk'"

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

# Email Link Extractor

A Bun.js application that extracts HTTP links from Gmail email files (.eml) in a zip archive, categorizes them using AI, and exports to CSV.

## Architecture

This project uses **Hexagonal Architecture** (Ports and Adapters pattern) for maximum flexibility and testability:

```
src/
├── domain/              # Core business logic (framework-agnostic)
│   ├── entities/        # Domain models
│   └── ports/           # Interfaces defining contracts
├── application/         # Use cases / business workflows
├── infrastructure/      # External adapters
│   ├── adapters/        # Implementations (Bun, Anthropic, etc.)
│   └── config/          # Configuration management
└── cli/                 # Command-line interface
```

### Benefits

- **Testable**: Domain logic is isolated and easy to unit test
- **Flexible**: Swap implementations without changing core logic
- **SDK-ready**: Can be packaged as a library
- **Future-proof**: Easy to extend with new features

## Prerequisites

- [Bun](https://bun.sh) installed
- Anthropic API key

## Setup

1. Install dependencies:

```bash
bun install
```

2. Create a `.env` file with your Anthropic API key:

```bash
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env
```

## Usage

### CLI (Powered by Cleye)

The CLI now uses [Cleye](https://github.com/privatenumber/cleye) - a modern, lightweight, and type-safe CLI framework.

#### Basic Usage

The CLI accepts both **zip files** and **folders** containing `.eml` files:

```bash
# From a zip file
bun run cli mylinks.zip
# or
bun run src/cli/index.ts mylinks.zip

# From a folder
bun run cli data/fixtures/test_mylinks
# or
bun run src/cli/index.ts data/fixtures/test_mylinks
```

This will:

1. Extract all `.eml` files from the zip or folder
2. Parse each email and extract the main HTTP link
3. Use Claude 3.5 Haiku to categorize and describe each link
4. Generate `output.csv` with columns: `link`, `tag`, `description`

#### Custom Output File

```bash
bun run cli mylinks.zip results.csv
# or with folder
bun run cli data/fixtures/test_mylinks results.csv
```

#### Verbose Mode

Enable detailed logging with stack traces:

```bash
bun run cli mylinks.zip --verbose
# or short form
bun run cli mylinks.zip -v
```

#### Help & Version

```bash
# Show help
bun run cli:help
# or
bun run src/cli/index.ts --help

# Show version
bun run cli:version
# or
bun run src/cli/index.ts --version
```

### Gmail Command

Fetch recent Gmail messages received since the last execution:

```bash
bun run cli gmail
```

**Features:**

- Incremental fetching - only shows new emails since last run
- Persistent tracking via `.gmail-last-run` timestamp file
- Rich display with sender, subject, date, and preview
- OAuth 2.0 authentication

**Setup:**

1. Create a Google Cloud project and enable Gmail API
2. Create OAuth 2.0 credentials (Desktop app)
3. Generate a refresh token
4. Add credentials to `.env`:

```bash
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
```

📖 **Full documentation**: See [docs/GMAIL_COMMAND.md](./docs/GMAIL_COMMAND.md) for detailed setup instructions, troubleshooting, and examples.

### Select Command

Interactively select and filter links from a CSV file:

```bash
bun run cli select output.csv
```

**Features:**

- Interactive UI powered by @clack/prompts
- Multiple selection modes (by link, by tag, all)
- Export selected links to new CSV
- Display in terminal or copy to clipboard

📖 **Full documentation**: See [docs/SELECT_COMMAND.md](./docs/SELECT_COMMAND.md)

## Output Format

The CSV file contains three columns:

- **link**: The extracted HTTP/HTTPS URL
- **tag**: AI-generated category (2-4 words, e.g., "AI/Machine Learning")
- **description**: AI-generated description (max 200 words)

## AI Model

Uses **Claude 3.5 Haiku** (`claude-3-5-haiku-20241022`) from Anthropic - their fastest and most cost-effective model, perfect for this use case.

## Extending the Application

### As an SDK

The hexagonal architecture makes it easy to use as a library:

```typescript
import { ExtractLinksUseCase } from "./application/ExtractLinksUseCase.js";
import { BunZipExtractor } from "./infrastructure/adapters/BunZipExtractor.js";
// ... import other adapters

const useCase = new ExtractLinksUseCase(
  new BunZipExtractor(),
  new EmailLinksExtractor(),
  new AnthropicAnalyzer(apiKey),
  new CsvFileWriter()
);

await useCase.execute("input.zip", "output.csv");
```

### Swapping Implementations

Want to use OpenAI instead of Anthropic? Just create a new adapter:

```typescript
class OpenAIAnalyzer implements ILinkAnalyzer {
  async analyze(url: string): Promise<LinkAnalysis> {
    // Your OpenAI implementation
  }
}
```

Then plug it into the use case - no other changes needed!

## Development

### Project Scripts

- `bun run start`: Run the CLI
- `bun run dev`: Run with auto-reload on changes

### Testing

This project follows **Test-Driven Development (TDD)** principles. Run tests with:

```bash
# Unit tests (fast, no external dependencies)
bun run test:unit

# Integration tests (requires API credentials)
bun run it

# E2E tests (complete workflows)
bun run test:e2e

# All tests
bun run test:unit && bun run it && bun run test:e2e
```

### Adding Features

We follow a **TDD-first approach**. When adding new features:

1. **Write tests first** - Define expected behavior through tests
2. **Implement minimal code** - Make tests pass
3. **Refactor** - Improve code quality while keeping tests green

**Guidelines**:

- **New domain logic**: Add to `src/domain/` (pure business logic, no dependencies)
- **New use case**: Add to `src/application/` (orchestrate domain logic)
- **New adapter**: Implement a port interface in `src/infrastructure/adapters/` (external integrations)

### Architecture & Testing Documentation

📚 **Comprehensive guides for TDD and architecture**:

- **[TDD.md](./TDD.md)** - Test-Driven Development guide with Red-Green-Refactor cycle
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Testing strategies, patterns, and best practices
- **[ARCHITECTURE_TESTING.md](./ARCHITECTURE_TESTING.md)** - How to test each layer of hexagonal architecture
- **[AI_TDD_PROMPTS.md](./AI_TDD_PROMPTS.md)** - Ready-to-use prompts for AI assistants (Cline, Copilot, etc.)
- **[.clinerules](./.clinerules)** - AI assistant rules for this project

These guides help ensure consistent development practices, especially when working with AI coding assistants.

## License

MIT

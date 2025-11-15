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

### Basic Usage

```bash
bun run src/cli/index.ts mylinks.zip
```

This will:

1. Extract all `.eml` files from `mylinks.zip`
2. Parse each email and extract the main HTTP link
3. Use Claude 3.5 Haiku to categorize and describe each link
4. Generate `output.csv` with columns: `link`, `tag`, `description`

### Custom Output File

```bash
bun run src/cli/index.ts mylinks.zip results.csv
```

### Help

```bash
bun run src/cli/index.ts --help
```

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

### Adding Features

1. **New domain logic**: Add to `src/domain/`
2. **New use case**: Add to `src/application/`
3. **New adapter**: Implement a port interface in `src/infrastructure/adapters/`

## License

MIT

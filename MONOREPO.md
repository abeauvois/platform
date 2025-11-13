# Monorepo Structure

This repository is organized as a monorepo containing:

- A reusable `@myorg/cached-http-client` library package
- The main `email-link-extractor` application

## Structure

```
/
├── packages/
│   └── cached-http-client/          # Reusable HTTP client library
│       ├── src/
│       │   ├── CachedHttpClient.ts  # Main client implementation
│       │   ├── ILogger.ts           # Logger interface
│       │   └── index.ts             # Public exports
│       ├── dist/                    # Compiled output (generated)
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── src/                             # Main application code
│   ├── application/                 # Use cases
│   ├── domain/                      # Business logic & interfaces
│   ├── infrastructure/              # External adapters
│   │   └── adapters/
│   │       ├── TwitterScraper.ts    # Uses @myorg/cached-http-client
│   │       └── ...
│   └── cli/                         # CLI entry point
│
├── package.json                     # Root workspace configuration
└── MONOREPO.md                      # This file
```

## Workspace Configuration

The monorepo uses Bun workspaces to manage packages:

```json
{
  "workspaces": ["packages/*"]
}
```

## Packages

### @myorg/cached-http-client

A standalone, reusable HTTP client library with:

- Request throttling to prevent rate limiting
- In-memory caching with optional TTL
- Automatic retries with exponential backoff
- Rate limit detection and handling
- Full TypeScript support

**Location:** `packages/cached-http-client/`

**Documentation:** See [packages/cached-http-client/README.md](packages/cached-http-client/README.md)

**Usage in other projects:**

```typescript
import { CachedHttpClient, type ILogger } from "@myorg/cached-http-client";

const logger: ILogger = {
  info: console.log,
  warning: console.warn,
  error: console.error,
};

const client = new CachedHttpClient<any>(logger, {
  throttleMs: 1000,
  retries: 3,
});
```

### Email Link Extractor (Main Application)

The main application that uses the cached-http-client library internally.

**Location:** `src/`

## Development Workflow

### Initial Setup

```bash
# Install all dependencies (root + all packages)
bun install

# Build the library
bun run build:lib

# Or build everything
bun run build
```

### Working on the Library

```bash
cd packages/cached-http-client

# Watch mode for development
bun run dev

# Build
bun run build

# The output will be in dist/
```

### Working on the Main Application

```bash
# From root directory

# Start the application
bun run start

# Development mode with watch
bun run dev
```

### Using the Library in the Main Application

The main application uses the library locally via workspace resolution:

```typescript
// In src/infrastructure/adapters/TwitterScraper.ts
import { CachedHttpClient } from "@myorg/cached-http-client";

export class TwitterScraper implements ITweetScraper {
  private readonly httpClient: CachedHttpClient<string>;

  constructor(bearerToken: string, logger: ILogger, throttleMs = 1000) {
    this.httpClient = new CachedHttpClient<string>(logger, {
      throttleMs,
      retries: 2,
    });
  }
}
```

## Publishing the Library

To publish `@myorg/cached-http-client` to npm:

```bash
cd packages/cached-http-client

# Update version in package.json
# Then build and publish
bun run build
npm publish
```

**Note:** Update the package name in `package.json` from `@myorg/cached-http-client` to your organization's scope.

## Benefits of Monorepo Structure

1. **Code Reusability**: The HTTP client can be used in multiple projects
2. **Shared Development**: Changes to the library immediately reflect in the app
3. **Version Control**: Both packages versioned together
4. **Simplified Dependencies**: Shared dependencies managed at root level
5. **Type Safety**: Full TypeScript support across package boundaries
6. **Independent Publishing**: Library can be published separately to npm

## Scripts

### Root Level

- `bun run build` - Build all packages
- `bun run build:lib` - Build only the library
- `bun run start` - Run the main application
- `bun run dev` - Run application in watch mode

### Library Package

- `bun run build` - Compile TypeScript to dist/
- `bun run dev` - Watch mode compilation

## Dependencies

### Root Workspace

- `@anthropic-ai/sdk` - AI analysis
- `@notionhq/client` - Notion integration
- `@poppinss/cliui` - CLI UI
- `jszip` - ZIP file handling

### Library Package

- Zero runtime dependencies
- Dev dependencies: TypeScript, Bun types

## Architecture

The monorepo follows **Hexagonal Architecture**:

- **Domain Layer**: Pure business logic (ports/interfaces)
- **Application Layer**: Use cases orchestrating domain logic
- **Infrastructure Layer**: External system adapters
  - Uses `@myorg/cached-http-client` for HTTP operations
  - Implements domain ports with concrete adapters

## Migration from Single Package

The original `CachedHttpClient` was moved from:

```
src/infrastructure/adapters/CachedHttpClient.ts
```

To:

```
packages/cached-http-client/src/CachedHttpClient.ts
```

With the following changes:

1. Created standalone package with own `package.json`
2. Added local `ILogger` interface (decoupled from main app)
3. Added comprehensive README and documentation
4. Added TypeScript build configuration
5. Created public API via `index.ts`

The main application was updated to:

1. Import from `@myorg/cached-http-client`
2. Continue using same API (backward compatible)

## Future Enhancements

Possible additions to the monorepo:

1. **More Libraries**:

   - `@myorg/email-parser` - Email parsing utilities
   - `@myorg/link-analyzer` - Link analysis tools

2. **Shared Packages**:

   - `@myorg/types` - Shared TypeScript types
   - `@myorg/utils` - Common utilities

3. **Testing**:
   - Shared test utilities
   - Integration tests across packages

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
rm -rf packages/cached-http-client/dist
cd packages/cached-http-client && bun run build
```

### Import Errors

```bash
# Reinstall dependencies
rm -rf node_modules
bun install
```

### TypeScript Errors

```bash
# Check TypeScript version
bun --version
tsc --version

# Ensure types are built
cd packages/cached-http-client && bun run build
```

## Contributing

When contributing to the monorepo:

1. Library changes go in `packages/cached-http-client/`
2. Application changes go in `src/`
3. Always build the library after changes: `bun run build:lib`
4. Update relevant README files
5. Add tests for new features

## License

MIT

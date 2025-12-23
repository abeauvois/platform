# Infrastructure Factories

This directory contains factory classes for creating infrastructure components like source readers.

## SourceReaderFactory

The `SourceReaderFactory` provides a centralized, type-safe way to create source reader instances based on `SourceAdapter` types.

### Why Use the Factory?

✅ **Centralized Creation** - All source reader instantiation logic in one place
✅ **Type Safety** - Compile-time checking ensures correct source types
✅ **Dependency Validation** - Runtime validation of required dependencies
✅ **Easy Testing** - Simple to mock and test
✅ **Extensibility** - Add new sources by updating one switch statement

### Basic Usage

```typescript
import { SourceReaderFactory } from "./infrastructure/factories/SourceReaderFactory.js";
import { SourceAdapter } from "./domain/entities/SourceAdapter.js";

// Create a Gmail source reader
const gmailSource = SourceReaderFactory.create("Gmail", logger, {
  emailClient: gmailClient,
  timestampRepository: timestampRepo,
});

// Create a ZipFile source reader
const zipSource = SourceReaderFactory.create("ZipFile", logger, {
  directoryReader: directoryReader,
});

// Create a Directory source reader
const dirSource = SourceReaderFactory.create("Directory", logger, {
  directoryReader: directoryReader,
});
```

### Dynamic Source Creation

```typescript
// Runtime source type selection
const sourceType: SourceAdapter = getUserSelectedSource(); // 'Gmail' | 'ZipFile' | 'Directory'

const sourceReader = SourceReaderFactory.create(
  sourceType,
  logger,
  getDependenciesForSource(sourceType)
);

// Use the source reader
const results = await sourceReader.ingest(config);
```

### Error Handling

The factory validates dependencies and throws descriptive errors:

```typescript
try {
  // Missing required dependency
  const source = SourceReaderFactory.create("Gmail", logger, {});
} catch (error) {
  // Error: Gmail source reader requires emailClient and timestampRepository
}

try {
  // Unsupported source type
  const source = SourceReaderFactory.create("Outlook", logger, {});
} catch (error) {
  // Error: Unsupported source adapter: Outlook
}
```

### Supported Sources

| Source Type | Required Dependencies                | Description                                    |
| ----------- | ------------------------------------ | ---------------------------------------------- |
| `Gmail`     | `emailClient`, `timestampRepository` | Fetches messages from Gmail API                |
| `ZipFile`   | `directoryReader`                    | Extracts and processes files from zip archives |
| `Directory` | `directoryReader`                    | Reads and processes files from directories     |

**Unsupported (will throw)**: `Outlook`, `EmlFile`, `NotionDatabase`, `Other`, `None`

### Testing Example

```typescript
import { describe, test, expect } from "bun:test";
import { SourceReaderFactory } from "./SourceReaderFactory.js";

describe("My Service", () => {
  test("should create correct source reader", () => {
    const mockLogger = createMockLogger();
    const mockDeps = {
      directoryReader: createMockDirectoryReader(),
    };

    const sourceReader = SourceReaderFactory.create(
      "ZipFile",
      mockLogger,
      mockDeps
    );

    expect(sourceReader.getSourceType()).toBe("Directory");
  });
});
```

### Extending the Factory

To add a new source reader type:

1. **Update SourceAdapter type** (if needed):

```typescript
// src/domain/entities/SourceAdapter.ts
export const SOURCE_ADAPTERS = [
  "Gmail",
  "ZipFile",
  "Directory",
  "MyNewSource", // ← Add here
  // ...
] as const;
```

2. **Add dependency interface** (if needed):

```typescript
// src/infrastructure/factories/SourceReaderFactory.ts
export interface SourceReaderDependencies {
  emailClient?: IEmailClient;
  directoryReader?: IDirectoryReader;
  myNewClient?: IMyNewClient; // ← Add here
}
```

3. **Add case to switch statement**:

```typescript
static create(source: SourceAdapter, logger: ILogger, deps: SourceReaderDependencies) {
  switch (source) {
    // ... existing cases ...

    case 'MyNewSource':
      return SourceReaderFactory.createMyNewSourceReader(logger, deps);

    // ...
  }
}
```

4. **Add private factory method**:

```typescript
private static createMyNewSourceReader(
  logger: ILogger,
  dependencies: SourceReaderDependencies
): MyNewSourceReader {
  const { myNewClient } = dependencies;

  if (!myNewClient) {
    throw new Error('MyNewSource source reader requires myNewClient');
  }

  return new MyNewSourceReader(myNewClient, logger);
}
```

5. **Write tests** (following TDD):

```typescript
test("should create MyNewSourceReader for MyNewSource type", () => {
  const source = SourceReaderFactory.create("MyNewSource", logger, {
    myNewClient: mockClient,
  });

  expect(source).toBeInstanceOf(MyNewSourceReader);
});
```

### Architecture Notes

The factory follows **hexagonal architecture** principles:

- Located in **Infrastructure layer** (correct placement)
- Creates source readers that orchestrate adapters
- Uses dependency injection for flexibility
- Returns domain interfaces (`AbstractSourceReader`)

### Related Files

- **Type Definition**: `src/domain/entities/SourceAdapter.ts`
- **Abstract Base**: `src/application/source-readers/AbstractSourceReader.ts`
- **Implementations**:
  - `src/application/source-readers/GmailSourceReader.ts`
  - `src/application/source-readers/DirectorySourceReader.ts`
- **Tests**: `src/infrastructure/tests/unit/test-data-source-factory.test.ts`

### See Also

- [SOURCE_ADAPTER_MIGRATION.md](../../../docs/SOURCE_ADAPTER_MIGRATION.md) - Details on the SourceAdapter type system
- [TDD.md](../../../TDD.md) - TDD practices used in this project
- [ARCHITECTURE_TESTING.md](../../../ARCHITECTURE_TESTING.md) - Testing hexagonal architecture

# CSV from Zip Workflow Implementation

This document describes the implementation of a dedicated workflow for extracting and parsing CSV files from zip archives using the WorkflowExecutor pattern.

## Architecture Overview

The implementation follows the **WorkflowExecutor pattern** with these components:

```
┌─────────────────────────────────────────────────────┐
│  CsvFromZipBookmarksWorkflowService                 │  Application Layer
│  (Orchestrates the workflow)                        │
└────────────┬────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────┐
│  WorkflowExecutor                                    │  Domain Layer
│  Producer → Pipeline → Consumer                      │
└────────────┬────────────────────────────────────────┘
             │
    ┌────────┴────────┬──────────────┬─────────────┐
    │                 │              │             │
┌───▼────┐    ┌──────▼──────┐  ┌───▼────┐   ┌────▼──────┐
│Producer│    │  Pipeline   │  │Consumer│   │  Stages   │
│        │    │             │  │        │   │           │
│CsvFrom │    │BaseContent  │  │Base    │   │CsvParser  │
│Zip     │    │Dedupe       │  │Content │   │Dedupe     │
│Producer│    │             │  │Collector   │           │
└────────┘    └─────────────┘  └────────┘   └───────────┘
```

## Components Created

### 1. CsvFromZipProducer

**Path**: `src/infrastructure/workflow/producers/CsvFromZipProducer.ts`

**Purpose**: Produces BaseContent items by extracting CSV files from zip and parsing them.

**Architecture**:

- Wraps `ZipFileDataSource` for extraction
- Applies `CsvParserStage` for parsing
- Yields one BaseContent per CSV row

```typescript
class CsvFromZipProducer implements IProducer<BaseContent> {
  async *produce(): AsyncIterable<BaseContent> {
    // 1. Extract from zip
    const rawContent = await this.dataSource.ingest(this.config);

    // 2. Parse CSV
    const csvStage = new CsvParserStage(this.csvParser);

    // 3. Yield parsed items
    for (const content of rawContent) {
      for await (const parsed of csvStage.process(content)) {
        yield parsed;
      }
    }
  }
}
```

### 2. BaseContentCollector

**Path**: `src/infrastructure/workflow/consumers/BaseContentCollector.ts`

**Purpose**: Collects BaseContent items into an array.

**Features**:

- Implements `IConsumer<BaseContent>`
- Lifecycle hooks: `onStart()`, `onComplete()`
- Simple collection with `getItems()` accessor

### 3. BaseContentDeduplicationStage

**Path**: `src/infrastructure/workflow/stages/BaseContentDeduplicationStage.ts`

**Purpose**: Filters duplicate items by URL within a workflow execution.

**Implementation**:

- In-memory Set for tracking seen URLs
- No external repository required
- Suitable for single-workflow deduplication

### 4. CsvFromZipBookmarksWorkflowService

**Path**: `src/application/services/CsvFromZipBookmarksWorkflowService.ts`

**Purpose**: Application service that orchestrates the complete CSV extraction workflow.

**Features**:

- Wires all components together
- Uses WorkflowExecutor for consistent patterns
- Optional deduplication
- Custom workflow options support
- Error handling and statistics

## Usage Examples

### Basic Usage

```typescript
import { CsvFromZipBookmarksWorkflowService } from "./application/services/CsvFromZipBookmarksWorkflowService.js";
import { ZipExtractor } from "./infrastructure/adapters/ZipExtractor.js";
import { SimpleCsvParser } from "./infrastructure/adapters/SimpleCsvParser.js";
import { CliuiLogger } from "./infrastructure/adapters/CliuiLogger.js";

const logger = new CliuiLogger();
const zipExtractor = new ZipExtractor();
const csvParser = new SimpleCsvParser();

const service = new CsvFromZipBookmarksWorkflowService(
  zipExtractor,
  csvParser,
  logger
);

const items = await service.extractAndParseCsv("./bookmarks.zip");
console.log(`Extracted ${items.length} bookmarks`);
```

### With Deduplication

```typescript
const service = new CsvFromZipBookmarksWorkflowService(
  zipExtractor,
  csvParser,
  logger,
  true // Enable deduplication
);

const items = await service.extractAndParseCsv("./bookmarks.zip");
// Duplicate URLs will be filtered out
```

### With Custom Workflow Options

```typescript
const items = await service.extractAndParseCsv("./bookmarks.zip", {
  onStart: async () => {
    console.log("Starting CSV extraction...");
  },
  onError: async (error, item) => {
    console.error(`Error processing ${item.url}: ${error.message}`);
    // Continue processing other items
  },
  onComplete: async (stats) => {
    console.log(`Statistics:
            - Items produced: ${stats.itemsProduced}
            - Items processed: ${stats.itemsProcessed}
            - Items consumed: ${stats.itemsConsumed}
            - Errors: ${stats.errors}
        `);
  },
});
```

### In createWorkflow.ts

```typescript
case "csvFromZip":
    const csvZipExtractor = new ZipExtractor();
    const csvParser = new SimpleCsvParser();
    const csvWorkflow = new CsvFromZipBookmarksWorkflowService(
        csvZipExtractor,
        csvParser,
        this.logger,
        true // Enable deduplication
    );
    const csvPath = join(__dirname, '../../../data/bookmarks.zip');
    const csvItems = await csvWorkflow.extractAndParseCsv(csvPath);
    this.logger.info(`📊 Extracted ${csvItems.length} items from CSV`);
    break;
```

## Benefits of WorkflowExecutor Pattern

### 1. Unified Error Handling

```typescript
onError: async (error: Error, item: BaseContent) => {
  logger.warning(`Failed to process: ${error.message}`);
  // Workflow continues with other items
};
```

Without WorkflowExecutor, you'd need manual try-catch in loops.

### 2. Statistics & Observability

```typescript
onComplete: async (stats) => {
  console.log(`Processed ${stats.itemsProduced} items`);
  console.log(`Errors: ${stats.errors}`);
};
```

Automatic tracking of pipeline metrics.

### 3. Lifecycle Hooks

- `onStart()` - initialization, logging
- `consumer.onStart()/onComplete()` - setup/cleanup
- `onComplete(stats)` - reporting, metrics

### 4. Consistent Pattern

All workflows follow the same structure, making the codebase easier to understand and maintain.

## CSV File Format

Expected CSV format:

```csv
url,tags,summary
https://example.com/article1,tech;programming,Great article
https://example.com/article2,ai;ml,ML tutorial
```

**Column Mapping**:

- `url`/`link`/`href` → BaseContent.url
- `tags` (semicolon or comma-separated) → BaseContent.tags[]
- `summary`/`description`/`desc` → BaseContent.summary
- All columns preserved as JSON in rawContent

## Testing

Comprehensive integration tests at:
`src/infrastructure/tests/integration/test-csv-from-zip-workflow.test.ts`

**Test Coverage**:

1. ✅ Extract and parse CSV from zip
2. ✅ Handle errors gracefully
3. ✅ Return workflow statistics
4. ✅ Deduplicate by URL
5. ✅ Preserve structured data

Run tests:

```bash
bun test src/infrastructure/tests/integration/test-csv-from-zip-workflow.test.ts
```

## Comparison: Service vs Direct Composition

### With Service (Implemented)

```typescript
const service = new CsvFromZipBookmarksWorkflowService(...);
const items = await service.extractAndParseCsv(path);
```

**Pros**:

- Reusable across multiple entry points
- Clean, simple API
- Encapsulated complexity
- Easy to test in isolation

### Without Service (Direct)

```typescript
const producer = new CsvFromZipProducer(...);
const pipeline = new Pipeline().addStage(...);
const consumer = new BaseContentCollector(...);
const workflow = new WorkflowExecutor(producer, pipeline, consumer);
await workflow.execute({...});
```

**When to use direct**:

- One-time use case
- Need fine-grained control
- Prototyping quickly

## Extension Points

### Add AI Enrichment

```typescript
import { ContentAnalyserStage } from "./stages/ContentAnalyserStage.js";

const pipeline = new Pipeline<BaseContent, BaseContent>()
  .addStage(new CsvParserStage(csvParser))
  .addStage(new BaseContentDeduplicationStage())
  .addStage(new ContentAnalyserStage(aiClient)); // Add enrichment
```

### Export to Notion

```typescript
import { NotionExportConsumer } from "./consumers/NotionExportConsumer.js";

const consumer = new NotionExportConsumer(notionClient, logger);
// Replace BaseContentCollector with NotionExportConsumer
```

### Filter Invalid URLs

```typescript
class UrlValidationStage implements IStage<BaseContent, BaseContent> {
  async *process(content: BaseContent): AsyncIterable<BaseContent> {
    if (content.url.startsWith("http")) {
      yield content; // Valid URL
    }
    // Invalid URLs are filtered out
  }
}
```

## Architecture Decisions

### Why Producer-based?

- **Consistency**: All workflows use Producer → Pipeline → Consumer
- **Composability**: Producers can be chained/composed
- **Testability**: Each component tests independently
- **Lifecycle**: WorkflowExecutor manages entire lifecycle

### Why Service Layer?

- **Reusability**: Used from CLI, API, tests
- **Clean API**: Simple `extractAndParseCsv()` interface
- **Encapsulation**: Hides complexity of wiring components
- **Testing**: Easy to mock/stub in tests

### Why BaseContent not Bookmark?

- **Flexibility**: BaseContent is more generic
- **Stage Composition**: Works with any transformation stages
- **Conversion**: Convert to Bookmark later if needed
- **Simplicity**: No need for AI enrichment in basic CSV import

## Performance Considerations

### Memory

- Producer yields items one at a time (streaming)
- Consumer accumulates in memory
- For large CSVs, consider streaming consumer

### Deduplication

- In-memory Set for tracking URLs
- O(1) lookup performance
- Memory grows with unique URLs
- For massive datasets, consider external store

## Summary

The CSV workflow implementation demonstrates:

- ✅ **WorkflowExecutor pattern** for consistency
- ✅ **Producer/Consumer architecture** for streaming
- ✅ **Service layer** for reusability
- ✅ **Pipeline composition** for flexibility
- ✅ **TDD approach** with comprehensive tests
- ✅ **Error handling** and statistics
- ✅ **Clean separation** of concerns

This pattern can be replicated for other data sources (S3, APIs, databases) by creating new Producers while reusing Stages and Consumers.

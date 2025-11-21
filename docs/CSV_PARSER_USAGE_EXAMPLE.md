# CSV Parser Stage - Usage Example

This document demonstrates how to use the CsvParserStage to ingest CSV files containing structured bookmark data.

## Architecture: Pipeline Composition (Approach 1)

The CSV parser follows the recommended **Pipeline Composition** pattern where:

- **Data Source** (ZipFileDataSource) extracts raw content
- **Pipeline Stage** (CsvParserStage) parses structure
- **Other Stages** can transform/enrich the data

This separation of concerns allows maximum reusability and flexibility.

## Quick Start

### 1. Prepare CSV File

Create a CSV file with your bookmarks:

```csv
url,tags,summary
https://example.com/typescript-guide,programming;typescript;web,Comprehensive guide to TypeScript best practices
https://example.com/ml-intro,ai;machine-learning;data-science,Introduction to Machine Learning fundamentals
https://example.com/docker-tutorial,devops;docker;containers,Docker containerization tutorial for beginners
```

**Column Requirements**:

- `url` (or `link`, `href`) - The bookmark URL
- `tags` - Semicolon or comma-separated tags
- `summary` (or `description`, `desc`) - Brief description

### 2. Create a Zip File (Optional)

```bash
zip bookmarks.zip bookmarks.csv
```

### 3. Use in Workflow

```typescript
import { ZipFileDataSource } from "./infrastructure/adapters/ZipFileDataSource.js";
import { ZipExtractor } from "./infrastructure/adapters/ZipExtractor.js";
import { CsvParserStage } from "./infrastructure/workflow/stages/CsvParserStage.js";
import { SimpleCsvParser } from "./infrastructure/adapters/SimpleCsvParser.js";
import { Pipeline } from "./domain/workflow/Pipeline.js";
import { CliuiLogger } from "./infrastructure/adapters/CliuiLogger.js";

// Setup
const logger = new CliuiLogger();
const zipExtractor = new ZipExtractor();
const csvParser = new SimpleCsvParser();

// Create data source (extracts files from zip)
const dataSource = new ZipFileDataSource(zipExtractor, logger);

// Ingest raw content
const config = { path: "./bookmarks.zip" };
const rawContent = await dataSource.ingest(config);
// Result: 1 BaseContent with CSV as rawContent

// Create pipeline with CSV parser stage
const pipeline = new Pipeline<BaseContent, BaseContent>().addStage(
  new CsvParserStage(csvParser)
);

// Process through pipeline
const results: BaseContent[] = [];
for (const content of rawContent) {
  for await (const parsed of pipeline.execute(content)) {
    results.push(parsed);
  }
}
// Result: 3 BaseContent items (one per CSV row)

// Each result has:
// - url: 'https://example.com/...'
// - tags: ['programming', 'typescript', 'web']
// - summary: 'Comprehensive guide...'
// - rawContent: JSON.stringify(row) - preserves original data
```

## Complete Workflow with Multiple Stages

```typescript
import { DeduplicationStage } from "./infrastructure/workflow/stages/DeduplicationStage.js";
import { BookmarkCollector } from "./infrastructure/workflow/consumers/BookmarkCollector.js";

// Create comprehensive pipeline
const pipeline = new Pipeline<BaseContent, BaseContent>()
  .addStage(new CsvParserStage(csvParser)) // Parse CSV → multiple items
  .addStage(new DeduplicationStage()); // Remove duplicates
// .addStage(new EnrichmentStage(aiAnalyzer))       // Optional: AI enrichment

// Create consumer to collect results
const consumer = new BookmarkCollector(logger);

// Process all content
for (const content of rawContent) {
  for await (const parsed of pipeline.execute(content)) {
    await consumer.consume(parsed);
  }
}

// Get final results
const bookmarks = consumer.getResults();
console.log(`Processed ${bookmarks.length} bookmarks`);
```

## Handling Mixed Content (CSV + EML)

The CSV parser automatically detects CSV content and passes through other formats:

```typescript
// Zip contains both .csv and .eml files
const mixedZipPath = "./mixed-content.zip";
const rawContent = await dataSource.ingest({ path: mixedZipPath });

const pipeline = new Pipeline<BaseContent, BaseContent>()
  .addStage(new CsvParserStage(csvParser)) // Parses CSV, passes EML through
  .addStage(new EmlParserStage()) // Would parse EML files if needed
  .addStage(new DeduplicationStage());

// All content types processed appropriately
```

## Using with Different Data Sources

The CSV parser works with **any** data source that produces BaseContent:

### From Directory

```typescript
import { DirectoryDataSource } from "./infrastructure/adapters/DirectoryDataSource.js";

const dirSource = new DirectoryDataSource(logger);
const rawContent = await dirSource.ingest({ path: "./csv-files/" });

// Same pipeline works!
const pipeline = new Pipeline<BaseContent, BaseContent>().addStage(
  new CsvParserStage(csvParser)
);
```

### From Zip File

Already shown above - works perfectly with ZipFileDataSource.

### From S3 Bucket

```typescript
// Future: S3DataSource implementation
const s3Source = new S3DataSource(s3Client, logger);
const rawContent = await s3Source.ingest({ bucket: "my-bookmarks" });

// Same pipeline works!
const pipeline = new Pipeline<BaseContent, BaseContent>().addStage(
  new CsvParserStage(csvParser)
);
```

## Advanced: Custom CSV Parser

You can create a custom CSV parser by implementing `ICsvParser`:

```typescript
import { ICsvParser, CsvRow } from "./domain/ports/ICsvParser.js";

export class CustomCsvParser implements ICsvParser {
  async parse(content: string): Promise<CsvRow[]> {
    // Your custom parsing logic
    // Perhaps handle different delimiters, encodings, etc.
    return parsedRows;
  }
}

// Use custom parser
const customParser = new CustomCsvParser();
const csvStage = new CsvParserStage(customParser);
```

## Error Handling

The CSV parser is resilient:

```typescript
// Invalid CSV content → passes through unchanged
const invalidCSV = new BaseContent(
  "not,csv,content\nincomplete",
  SourceAdapter.ZipFile,
  [],
  "",
  "not,csv,content\nincomplete",
  new Date(),
  new Date()
);

// Process through CSV stage
const results: BaseContent[] = [];
for await (const result of csvStage.process(invalidCSV)) {
  results.push(result);
}

// Result: Original content unchanged (1 item)
// No errors thrown - graceful degradation
```

## Testing Your CSV Workflow

```typescript
import { test, expect } from "bun:test";

test("should parse bookmarks from CSV file", async () => {
  const zipPath = "./test-bookmarks.zip";
  const dataSource = new ZipFileDataSource(zipExtractor, logger);
  const csvParser = new SimpleCsvParser();

  // Extract
  const rawContent = await dataSource.ingest({ path: zipPath });

  // Parse
  const csvStage = new CsvParserStage(csvParser);
  const results: BaseContent[] = [];

  for (const content of rawContent) {
    for await (const parsed of csvStage.process(content)) {
      results.push(parsed);
    }
  }

  // Assert
  expect(results.length).toBeGreaterThan(0);
  expect(results[0].url).toContain("https://");
  expect(results[0].tags.length).toBeGreaterThan(0);
});
```

## Summary

**Benefits of Pipeline Composition**:

- ✅ **Reusable**: CSV parser works with any data source
- ✅ **Composable**: Easily add/remove stages
- ✅ **Testable**: Each component tested independently
- ✅ **Flexible**: Supports mixed content types
- ✅ **Maintainable**: Clear separation of concerns

**Key Principle**:

- Data Source handles **extraction**
- Pipeline Stage handles **transformation**
- Consumer handles **collection**

This architecture follows the Single Responsibility Principle and makes the codebase easy to extend and maintain.

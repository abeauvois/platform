# Pipeline Stages

This directory contains transformation stages that can be composed in data processing pipelines.

## Available Stages

### CsvParserStage

**Purpose**: Parses CSV content within BaseContent items into multiple structured BaseContent items (one per row).

**Type**: `IStage<BaseContent, BaseContent>`

**Behavior**:

- **CSV Detection**: Automatically detects if content is CSV format
- **One-to-Many Transform**: Converts 1 CSV file → N BaseContent items (one per row)
- **Pass-Through**: Non-CSV content passes through unchanged
- **Error Handling**: If parsing fails, content passes through unchanged

**Usage**:

```typescript
import { CsvParserStage } from "./stages/CsvParserStage.js";
import { SimpleCsvParser } from "../adapters/SimpleCsvParser.js";
import { Pipeline } from "../../domain/workflow/Pipeline.js";

const csvParser = new SimpleCsvParser();
const pipeline = new Pipeline<BaseContent, BaseContent>()
  .addStage(new CsvParserStage(csvParser))
  .addStage(/* other stages */);
```

**CSV Format Requirements**:

- First row must contain column headers
- Comma-separated values
- Must have at least 2 rows (header + data)

**Column Mapping**:

- `url`, `link`, or `href` → BaseContent.url
- `tags` → BaseContent.tags (split by semicolon or comma)
- `summary`, `description`, or `desc` → BaseContent.summary
- All columns preserved as JSON in `rawContent`

**Example CSV**:

```csv
url,tags,summary
https://example.com,tech;programming,Great article
https://example.org,ai;ml,ML tutorial
```

**Output**: 2 BaseContent items with structured data.

### DeduplicationStage

**Purpose**: Removes duplicate items based on URL.

**Type**: `IStage<BaseContent, BaseContent>`

### EmlContentAnalyserStage

**Purpose**: Analyzes email file content and extracts links with AI enrichment.

**Type**: `IStage<EmailFile, Bookmark>`

### GmailContentAnalyserStage

**Purpose**: Analyzes Gmail messages and extracts links with AI enrichment.

**Type**: `IStage<GmailMessage, Bookmark>`

## Creating New Stages

To create a new pipeline stage:

1. Implement `IStage<TInput, TOutput>` interface
2. Use async generator for `process()` method
3. Support one-to-many, one-to-one, or filtering transforms
4. Handle errors gracefully (often pass-through on error)
5. Write integration tests in `tests/integration/`

Example skeleton:

```typescript
import { IStage } from "../../../domain/workflow/IStage.js";

export class MyNewStage implements IStage<InputType, OutputType> {
  constructor(private dependency: IDependency) {}

  async *process(input: InputType): AsyncIterable<OutputType> {
    try {
      // Transform logic here
      yield transformedOutput;
    } catch (error) {
      // Handle errors - often pass through unchanged
      yield input;
    }
  }
}
```

## Stage Composition

Stages can be composed in pipelines to create complex data transformations:

```typescript
const pipeline = new Pipeline<BaseContent, Bookmark>()
  .addStage(new CsvParserStage(csvParser)) // Parse CSV → multiple items
  .addStage(new DeduplicationStage()) // Remove duplicates
  .addStage(new EnrichmentStage(analyzer)); // Enrich with AI
```

The pipeline executes stages in order, with output from one stage becoming input to the next.

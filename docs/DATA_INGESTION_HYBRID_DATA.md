# Handling Hybrid Data Sources

## The Challenge

How do we handle cases where structured data (like CSV) is contained within unstructured containers (like zip files)?

**Example**: A zip file containing CSV files with structured rows and columns.

## Architectural Approaches

### Approach 1: Pipeline Composition (RECOMMENDED) ✅

**Philosophy**: Separate concerns - data source handles extraction, pipeline handles parsing.

```
ZipFileDataSource → CSVParserStage → ContentEnrichmentStage → Consumer
     (Extract)         (Parse)            (Transform)          (Collect)
```

**Why This Works:**

- ✅ **Separation of Concerns**: Each component has one job
- ✅ **Reusability**: CSV parser can work with any source (zip, directory, S3, etc.)
- ✅ **Flexibility**: Easy to swap or add stages
- ✅ **Testability**: Each stage tested independently

**Implementation:**

```typescript
// 1. Use existing ZipFileDataSource to extract raw content
const dataSource = new ZipFileDataSource(zipExtractor, logger);

// 2. Create CSV Parser Stage for pipeline
class CsvParserStage implements IStage<BaseContent, BaseContent> {
  constructor(private csvParser: ICsvParser) {}

  async *process(content: BaseContent): AsyncIterable<BaseContent> {
    // Detect if content is CSV
    if (this.isCsvContent(content.rawContent)) {
      // Parse CSV rows
      const rows = await this.csvParser.parse(content.rawContent);

      // Yield one BaseContent per row
      for (const row of rows) {
        yield new BaseContent(
          row.url || JSON.stringify(row), // URL from CSV or serialized row
          content.sourceAdapter,
          row.tags ? row.tags.split(",") : [],
          row.summary || "",
          JSON.stringify(row), // Store structured data as JSON string
          content.createdAt,
          new Date()
        );
      }
    } else {
      // Not CSV, pass through unchanged
      yield content;
    }
  }

  private isCsvContent(content: string): boolean {
    // Simple heuristic: check for comma-separated values
    return (
      content.includes(",") &&
      (content.includes("\n") || content.includes("\r"))
    );
  }
}

// 3. Compose the workflow
const producer = new GenericDataSourceProducer(dataSource, {
  path: "/path/to/bookmarks.zip",
});

const pipeline = new Pipeline<BaseContent, BaseContent>()
  .addStage(new CsvParserStage(csvParser)) // Parse CSV if detected
  .addStage(new DeduplicationStage()) // Remove duplicates
  .addStage(new EnrichmentStage(aiAnalyzer)); // Enrich with AI

const consumer = new BookmarkCollector(logger);

const workflow = new WorkflowExecutor(producer, pipeline, consumer);
await workflow.execute();
```

**Advantages:**

- CSV parsing logic is isolated in a pipeline stage
- Same zip extractor works for any file type
- Can handle mixed-content zips (some CSV, some .eml)
- Easy to add/remove parsing stages

---

### Approach 2: Specialized Data Source

**Philosophy**: Create a specialized data source for this specific use case.

```typescript
class CsvZipDataSource extends UnstructuredDataSource<CsvFile, BaseContent> {
  constructor(
    private zipExtractor: IZipExtractor,
    private csvParser: ICsvParser,
    logger: ILogger
  ) {
    super(SourceAdapter.ZipFile, logger);
  }

  protected async fetchRaw(config: FileIngestionConfig): Promise<CsvFile[]> {
    // Extract files from zip
    const filesMap = await this.zipExtractor.extractFiles(config.path);

    // Filter only CSV files
    const csvFiles: CsvFile[] = [];
    for (const [filename, content] of filesMap.entries()) {
      if (filename.endsWith(".csv")) {
        csvFiles.push({ filename, content });
      }
    }

    return csvFiles;
  }

  protected async normalize(csvFiles: CsvFile[]): Promise<BaseContent[]> {
    const results: BaseContent[] = [];

    for (const file of csvFiles) {
      // Parse CSV content
      const rows = await this.csvParser.parse(file.content);

      // Create one BaseContent per row
      for (const row of rows) {
        results.push(
          new BaseContent(
            row.url || JSON.stringify(row),
            SourceAdapter.ZipFile,
            row.tags ? row.tags.split(",") : [],
            row.summary || "",
            JSON.stringify(row),
            new Date(),
            new Date()
          )
        );
      }
    }

    return results;
  }
}
```

**Advantages:**

- Single component handles the entire flow
- Type-safe with specific CSV types
- Clear naming conveys intent

**Disadvantages:**

- Less reusable (tied to zip + CSV combination)
- Would need separate `DirectoryCsvDataSource`, `S3CsvDataSource`, etc.
- Harder to support mixed file types

---

### Approach 3: Hybrid Data Source with Strategy

**Philosophy**: Create a smart data source that delegates to different parsers based on file type.

```typescript
class SmartZipDataSource extends UnstructuredDataSource<
  EmailFile,
  BaseContent
> {
  private parsers: Map<string, IFileParser> = new Map();

  constructor(private zipExtractor: IZipExtractor, logger: ILogger) {
    super(SourceAdapter.ZipFile, logger);

    // Register parsers for different file types
    this.parsers.set(".csv", new CsvParser());
    this.parsers.set(".eml", new EmlParser());
    this.parsers.set(".json", new JsonParser());
  }

  protected async normalize(files: EmailFile[]): Promise<BaseContent[]> {
    const results: BaseContent[] = [];

    for (const file of files) {
      const extension = this.getExtension(file.filename);
      const parser = this.parsers.get(extension);

      if (parser) {
        // Use appropriate parser
        const parsed = await parser.parse(file.content);
        results.push(...parsed);
      } else {
        // Default: treat as plain text
        results.push(
          new BaseContent(
            file.content,
            SourceAdapter.ZipFile,
            [],
            "",
            file.content,
            new Date(),
            new Date()
          )
        );
      }
    }

    return results;
  }

  private getExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf("."));
  }
}
```

**Advantages:**

- Handles multiple file types intelligently
- Single data source for all zip content
- Easy to add new parsers

**Disadvantages:**

- Data source becomes more complex
- Mixing parsing logic with extraction logic

---

## Recommendation: Use Approach 1 (Pipeline Composition)

### Why?

1. **Follows Single Responsibility Principle**

   - Data source: extracts raw content
   - Pipeline stage: parses structure
   - Clear separation of concerns

2. **Maximum Reusability**

   - CSV parser stage can work with:
     - Zip files
     - Directories
     - S3 buckets
     - HTTP downloads
     - Any source that produces BaseContent with CSV in rawContent

3. **Flexibility**

   - Easy to add/remove/reorder stages
   - No need to create specialized data sources for each combination
   - Supports mixed-content containers

4. **Testability**

   - Test zip extraction independently
   - Test CSV parsing independently
   - Test full workflow end-to-end

5. **Aligns with Existing Architecture**
   - Your codebase already uses Pipeline pattern
   - Consistent with how EmlContentAnalyserStage works
   - Follows established patterns

### Example: Complete Implementation

```typescript
// interfaces/ICsvParser.ts
export interface ICsvParser {
  parse(content: string): Promise<CsvRow[]>;
}

export interface CsvRow {
  [key: string]: string;
}

// stages/CsvParserStage.ts
export class CsvParserStage implements IStage<BaseContent, BaseContent> {
  constructor(private csvParser: ICsvParser) {}

  async *process(content: BaseContent): AsyncIterable<BaseContent> {
    // Only process if content looks like CSV
    if (!this.isCsvContent(content.rawContent)) {
      yield content;
      return;
    }

    // Parse CSV content
    const rows = await this.csvParser.parse(content.rawContent);

    // Yield one BaseContent per CSV row
    for (const row of rows) {
      yield this.rowToBaseContent(row, content);
    }
  }

  private isCsvContent(content: string): boolean {
    // Check for CSV characteristics
    const firstLine = content.split("\n")[0];
    return firstLine.includes(",") && content.includes("\n");
  }

  private rowToBaseContent(row: CsvRow, source: BaseContent): BaseContent {
    return new BaseContent(
      row.url || row.link || JSON.stringify(row), // Try common column names
      source.sourceAdapter,
      row.tags ? row.tags.split(",").map((t) => t.trim()) : [],
      row.summary || row.description || "",
      JSON.stringify(row), // Preserve structured data
      source.createdAt,
      new Date()
    );
  }
}

// adapters/SimpleCsvParser.ts
export class SimpleCsvParser implements ICsvParser {
  async parse(content: string): Promise<CsvRow[]> {
    const lines = content.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    // First line is header
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows: CsvRow[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: CsvRow = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      rows.push(row);
    }

    return rows;
  }
}

// Usage Example
const zipDataSource = new ZipFileDataSource(zipExtractor, logger);
const csvParser = new SimpleCsvParser();

const producer = new GenericDataSourceProducer(zipDataSource, {
  path: "/path/to/bookmarks.zip",
});

const pipeline = new Pipeline<BaseContent, BaseContent>()
  .addStage(new CsvParserStage(csvParser)) // Parse CSV rows
  .addStage(new DeduplicationStage()) // Dedupe
  .addStage(new ContentAnalyserStage(aiAnalyzer)); // Enrich

const consumer = new BookmarkCollector(logger);

const workflow = new WorkflowExecutor(producer, pipeline, consumer);
await workflow.execute();
```

## Handling Edge Cases

### Mixed Content Zips

**Scenario**: Zip contains both .eml files and .csv files

**Solution**: Multiple parser stages

```typescript
const pipeline = new Pipeline<BaseContent, BaseContent>()
  .addStage(new CsvParserStage(csvParser)) // Parse CSV
  .addStage(new EmlParserStage(emlParser)) // Parse EML
  .addStage(new JsonParserStage(jsonParser)) // Parse JSON
  .addStage(new DeduplicationStage()); // Dedupe
```

Each stage checks if content matches its format and either:

- Processes it (if match)
- Passes through unchanged (if no match)

### Nested Structures

**Scenario**: CSV file contains JSON in a column

**Solution**: Chain multiple parser stages

```typescript
const pipeline = new Pipeline<BaseContent, BaseContent>()
  .addStage(new CsvParserStage(csvParser)) // Parse CSV rows
  .addStage(new JsonColumnParserStage("data")) // Parse JSON in 'data' column
  .addStage(new DeduplicationStage());
```

### Large Files

**Scenario**: CSV with millions of rows

**Solution**: Streaming parser stage

```typescript
class StreamingCsvParserStage implements IStage<BaseContent, BaseContent> {
  async *process(content: BaseContent): AsyncIterable<BaseContent> {
    if (!this.isCsvContent(content.rawContent)) {
      yield content;
      return;
    }

    // Stream parse - yield rows as they're parsed
    const stream = this.csvParser.stream(content.rawContent);

    for await (const row of stream) {
      yield this.rowToBaseContent(row, content);
    }
  }
}
```

## Summary

**Best Practice**: Use pipeline composition with specialized stages

```
Data Source (extraction) → Parser Stage (structure) → Transform Stages → Consumer
```

This approach:

- ✅ Maximizes reusability
- ✅ Maintains separation of concerns
- ✅ Supports any combination of container + content
- ✅ Follows existing architecture patterns
- ✅ Easy to test and maintain

**When to use specialized data sources:**

- Very specific use case that won't be reused
- Performance-critical path requiring optimization
- Tight coupling between container and content is beneficial

**Key Principle**: Let the data source handle **extraction**, let pipeline stages handle **transformation**.

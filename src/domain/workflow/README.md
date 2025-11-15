# Workflow Framework

A lightweight, TypeScript-based workflow system for building data processing pipelines with async generators and error handling.

## Overview

This workflow framework provides a flexible way to process data through a pipeline of transformations. It's inspired by ETL (Extract, Transform, Load) patterns and consists of three main components:

1. **Producer** - Generates a stream of input data
2. **Pipeline** - Chains transformation stages
3. **Consumer** - Processes final output

## Core Components

### IProducer<T>

Generates a stream of data items using async generators.

```typescript
interface IProducer<T> {
  produce(): AsyncIterable<T>;
}
```

### IStage<TInput, TOutput>

Transforms data items in the pipeline. Can output zero, one, or multiple items per input.

```typescript
interface IStage<TInput, TOutput> {
  process(item: TInput): AsyncIterable<TOutput>;
}
```

### IConsumer<T>

The endpoint that processes final output items.

```typescript
interface IConsumer<T> {
  consume(item: T): Promise<void>;
  onStart?(): Promise<void>;
  onComplete?(): Promise<void>;
}
```

### Pipeline<TInput, TOutput>

Chains multiple stages together for data transformation.

```typescript
const pipeline = new Pipeline<Input, Output>(firstStage)
  .addStage(secondStage)
  .addStage(thirdStage);
```

### WorkflowExecutor<TInput, TOutput>

Orchestrates the complete workflow with error handling.

```typescript
const executor = new WorkflowExecutor(producer, pipeline, consumer);
await executor.execute({
  onError: async (error, item) => {
    // Handle errors
  },
  onComplete: async (stats) => {
    // Process completion stats
  },
});
```

## Usage Example

### 1. Create a Producer

```typescript
import { IProducer } from "./domain/workflow";

class ZipFileProducer implements IProducer<EmailFile> {
  constructor(
    private readonly filePath: string,
    private readonly zipExtractor: IZipExtractor
  ) {}

  async *produce(): AsyncIterable<EmailFile> {
    const files = await this.zipExtractor.extractEmlFiles(this.filePath);
    for (const [filename, content] of files.entries()) {
      yield { filename, content };
    }
  }
}
```

### 2. Create Pipeline Stages

```typescript
import { IStage } from "./domain/workflow";

class EmailParserStage implements IStage<EmailFile, EmailLink> {
  constructor(private readonly linksExtractor: ILinksExtractor) {}

  async *process(emailFile: EmailFile): AsyncIterable<EmailLink> {
    const links = this.linksExtractor.extractLinks(emailFile.content);
    if (links.length > 0) {
      yield new EmailLink(links[0], "", "", emailFile.filename);
    }
  }
}
```

### 3. Create a Consumer

```typescript
import { IConsumer } from "./domain/workflow";

class EmailLinkCollector implements IConsumer<EmailLink> {
  private emailLinks: EmailLink[] = [];

  async consume(emailLink: EmailLink): Promise<void> {
    this.emailLinks.push(emailLink);
  }

  async onComplete(): Promise<void> {
    console.log(`Collected ${this.emailLinks.length} links`);
  }

  getEmailLinks(): EmailLink[] {
    return this.emailLinks;
  }
}
```

### 4. Assemble and Execute Workflow

```typescript
import { Pipeline, WorkflowExecutor } from "./domain/workflow";

// Create components
const producer = new ZipFileProducer(zipPath, zipExtractor);
const pipeline = new Pipeline(new EmailParserStage(linksExtractor));
const consumer = new EmailLinkCollector(logger);

// Execute workflow
const workflow = new WorkflowExecutor(producer, pipeline, consumer);
await workflow.execute({
  onStart: async () => {
    console.log("Starting workflow...");
  },
  onError: async (error, item) => {
    console.error(`Error processing item:`, error);
  },
  onComplete: async (stats) => {
    console.log("Workflow completed:", stats);
  },
});

// Get results
const results = consumer.getEmailLinks();
```

## Error Handling

The workflow system provides robust error handling at multiple levels:

### Item-Level Error Handling

Errors can be caught and handled per item without stopping the workflow:

```typescript
await workflow.execute({
  onError: async (error: Error, item: EmailFile) => {
    logger.warning(`Failed to process ${item.filename}: ${error.message}`);
    // Continue processing next items
  },
});
```

### Workflow Statistics

The executor provides detailed statistics about the workflow execution:

```typescript
interface WorkflowStats {
  itemsProduced: number; // Total items from producer
  itemsProcessed: number; // Total items through pipeline
  itemsConsumed: number; // Total items successfully consumed
  errors: number; // Total errors encountered
}
```

## Key Features

✅ **Async Generators** - Built on async/await and generators for streaming data  
✅ **Type-Safe** - Full TypeScript support with generic types  
✅ **Error Handling** - Comprehensive error handling at workflow level  
✅ **Composable** - Chain multiple stages for complex transformations  
✅ **Flexible** - Supports one-to-one, one-to-many, and filtering operations  
✅ **Lifecycle Hooks** - onStart and onComplete hooks for initialization/cleanup

## Pipeline Patterns

### Filtering

A stage can filter out items by not yielding anything:

```typescript
class FilterStage implements IStage<Item, Item> {
  async *process(item: Item): AsyncIterable<Item> {
    if (this.shouldKeep(item)) {
      yield item;
    }
    // Item is filtered out if condition not met
  }
}
```

### One-to-Many Transformation

A stage can yield multiple items from a single input:

```typescript
class SplitStage implements IStage<Batch, Item> {
  async *process(batch: Batch): AsyncIterable<Item> {
    for (const item of batch.items) {
      yield item;
    }
  }
}
```

### Enrichment

A stage can enrich data with additional information:

```typescript
class EnrichmentStage implements IStage<Item, EnrichedItem> {
  async *process(item: Item): AsyncIterable<EnrichedItem> {
    const metadata = await this.fetchMetadata(item.id);
    yield { ...item, metadata };
  }
}
```

## Extending the System

### New Input Sources

Create custom producers for different data sources:

- S3 buckets
- HTTP APIs
- Databases
- File systems
- Message queues

### Custom Stages

Add domain-specific transformation stages:

- Data validation
- Format conversion
- Enrichment with external APIs
- Filtering and mapping

### Multiple Consumers

Create consumers for different outputs:

- Database writers
- File exporters
- API publishers
- Real-time streaming

## Benefits over Manual Implementation

1. **Separation of Concerns** - Each component has a single responsibility
2. **Reusability** - Stages can be reused across different workflows
3. **Testability** - Each component can be tested independently
4. **Maintainability** - Clear structure makes code easier to understand
5. **Scalability** - Easy to add new stages or swap implementations

## Future Enhancements

Potential improvements for future versions:

- Parallel processing support
- Retry mechanisms per stage
- Progress tracking and reporting
- Pipeline branching/forking
- Conditional stage execution
- Performance metrics collection

# Workflow System

A generic, composable workflow system with a specialized builder for link extraction.

## Architecture

```
WorkflowBuilder<T>           (Generic base class)
       ↓
LinkExtractionBuilder        (Specialized for Bookmark)
       ↓
IWorkflowStep<Bookmark>      (Concrete steps)
```

## Quick Start

```typescript
import { LinkExtractionFactory } from '../../infrastructure/factories/LinkExtractionFactory';

const factory = new LinkExtractionFactory(config, logger);

// Use a preset
const workflow = factory.createPreset('quick');
await workflow.execute(inputPath, outputPath);

// Or build a custom workflow
const workflow = factory.builder()
    .extract()
    .analyze()
    .exportTo({ csv: true })
    .build();
await workflow.execute(inputPath, outputPath);
```

## Available Presets

| Preset | Steps | Use Case |
|--------|-------|----------|
| `full` | Extract → Analyze → Twitter → Retry → Export (CSV + Notion) | Complete processing |
| `quick` | Extract → Export (CSV) | Fast extraction, no AI |
| `analyzeOnly` | Extract → Analyze → Export | AI analysis, no Twitter |
| `twitterFocus` | Extract → Twitter → Retry → Export | Twitter-heavy sources |
| `csvOnly` | Extract → Analyze → Export (CSV) | No Notion integration |

## Building Custom Workflows

```typescript
const workflow = factory.builder()
    .extract()                              // Required: extract from source
    .analyze()                              // Optional: AI categorization
    .enrichTwitter()                        // Optional: Twitter content
    .withRetry()                            // Optional: retry rate-limited links
    .exportTo({ csv: true, notion: false }) // Required: export results
    .build();
```

### Conditional Steps

```typescript
const workflow = factory.builder()
    .extract()
    .when(includeAnalysis, b => b.analyze())
    .when(includeTwitter, b => b.enrichTwitter().withRetry())
    .exportTo({ csv: true })
    .build();
```

## Custom Steps

```typescript
import { Bookmark } from '../../domain/entities/Bookmark';
import { IWorkflowStep, WorkflowContext, StepResult } from './IWorkflowStep';

class MyCustomStep implements IWorkflowStep<Bookmark> {
    readonly name = 'my-custom-step';

    async execute(context: WorkflowContext<Bookmark>): Promise<StepResult<Bookmark>> {
        const processed = context.items.map(b => /* transform */);
        return {
            context: { ...context, items: processed },
            continue: true,
            message: 'Custom processing complete',
        };
    }
}

const workflow = factory.builder()
    .extract()
    .addStep(new MyCustomStep())
    .exportTo({ csv: true })
    .build();
```

## Generic Workflow for Other Types

The base `WorkflowBuilder<T>` can be extended for any entity type:

```typescript
import { WorkflowBuilder, IWorkflowStep } from './WorkflowBuilder';

interface MyEntity { id: string; data: string; }

class MyEntityBuilder extends WorkflowBuilder<MyEntity> {
    constructor(logger: ILogger) {
        super(logger);
    }

    load(): this {
        this.addStep(new LoadStep());
        return this;
    }

    process(): this {
        this.addStep(new ProcessStep());
        return this;
    }
}
```

## Data Flow

```
LinkExtractionBuilder
    │
    ├── ExtractionStep ──► context.items populated
    │
    ├── AnalysisStep ────► items enriched with AI tags/summary
    │
    ├── TwitterEnrichmentStep ──► Twitter links enriched
    │   └── stores retry queue in context.metadata
    │
    ├── RetryStep ───────► processes retry queue from metadata
    │
    └── ExportStep ──────► writes to CSV/Notion
```

Each step receives `WorkflowContext<T>` and returns updated context with continuation flag.

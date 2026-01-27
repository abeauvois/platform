# Workflow Flow

This document describes the data flow for content workflows from CLI to background task.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLI LAYER                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  apps/cli/commands/list/gmail.ts                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  gmailCommand                                                       │        │
│  │  • Parses flags: --filter, --limitDays, --withUrl, --saveTo         │        │
│  │  • Creates filter: { email?, limitDays?, withUrl? }                 │        │
│  │  • Calls: ctx.apiClient.workflow.create('gmail', { filter, saveTo })│        │
│  └──────────────────────────────┬──────────────────────────────────────┘        │
│                                 │                                               │
└─────────────────────────────────┼───────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SDK LAYER                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  packages/platform-sdk/src/Workflow.ts                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  Workflow.execute()                                                 │        │
│  │  const { preset, options, logger } = this.config;                   │        │
│  │  • POST /api/workflows → startTask()                                │        │
│  │  • GET /api/workflows/:taskId → pollTaskStatus() (loops until done) │        │
│  │  • Fires hooks: onStart, onItemProcessed, onComplete, onError       │        │
│  └──────────────────────────────┬──────────────────────────────────────┘        │
│                                 │                                               │
│  packages/platform-sdk/src/types.ts                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  WorkflowFilter { email?, limitDays?, withUrl? }                    │        │
│  │  ProcessedItem { id, url, sourceAdapter, tags, summary?, rawContent? }       │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                 │
└─────────────────────────────────┼───────────────────────────────────────────────┘
                                  │ HTTP
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API SERVER (port 3000)                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  apps/api/server/validators/workflow.validator.ts                               │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  workflowSchema (Zod)                                               │        │
│  │  • Validates: preset, filter, saveTo                                │        │
│  └──────────────────────────────┬──────────────────────────────────────┘        │
│                                 │                                               │
│  apps/api/server/routes/workflow.routes.ts                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  POST /api/workflows                                                │        │
│  │  • Creates taskId via BackgroundTaskService                         │        │
│  │  • Enqueues task to pg-boss queue                                   │        │
│  │  • Returns { taskId, status: 'pending' }                            │        │
│  │                                                                     │        │
│  │  GET /api/workflows/:taskId                                         │        │
│  │  • Returns task status + progress + result                          │        │
│  └──────────────────────────────┬──────────────────────────────────────┘        │
│                                 │                                               │
└─────────────────────────────────┼───────────────────────────────────────────────┘
                                  │ pg-boss queue
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BACKGROUND WORKER                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  apps/api/server/tasks/workers/workflow.worker.ts                               │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  processWorkflowTask()                                              │        │
│  │  • Gets SourceReader for preset (e.g., createGmailSourceReader)     │        │
│  │  • Builds WorkflowBuilder with dynamic steps based on config        │        │
│  │  • Converts BaseContent[] → ProcessedItem[]                         │        │
│  └──────────────────────────────┬──────────────────────────────────────┘        │
│                                 │                                               │
│  apps/api/server/tasks/workers/presets.ts                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  Preset configurations (gmail, bookmark, analyzeOnly, etc.)         │        │
│  │  • createSourceReader() - returns ISourceReader for the preset      │        │
│  │  • createSteps(config) - dynamically builds steps based on:         │        │
│  │      - saveTo: 'database' → adds SaveToBookmarkStep                 │        │
│  │      - saveTo: undefined → adds ExportStep (default)                │        │
│  │      - skipAnalysis: true → skips AnalyzeStep                       │        │
│  └──────────────────────────────┬──────────────────────────────────────┘        │
│                                 │                                               │
└─────────────────────────────────┼───────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           INFRASTRUCTURE                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  apps/api/server/infrastructure/GmailApiClient.ts                               │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  GmailApiClient implements IEmailClient                             │        │
│  │  • fetchMessagesSince(since, filterEmail?, withUrl?)                │        │
│  │  • Builds Gmail query: `after:{timestamp} from:{email}`             │        │
│  │  • Fetches message details via Google API                           │        │
│  │  • Filters by URL presence if withUrl=true                          │        │
│  │  • Returns GmailMessage[]                                           │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                 │
│  apps/api/server/infrastructure/DrizzleBackgroundTaskRepository.ts              │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  DrizzleBackgroundTaskRepository implements IBackgroundTaskRepository│        │
│  │  • Persists task state to PostgreSQL via Drizzle ORM                │        │
│  │  • Maps domain (taskId) ↔ database (id, pgBossJobId)                │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Summary

```
User CLI Input
     │
     ▼
WorkflowFilter { email, limitDays, withUrl }
     │
     ▼
POST /api/workflows ──► pg-boss queue ──► Worker picks up task
     │                                        │
     │                                        ▼
     │                              GmailApiClient.fetchMessagesSince()
     │                                        │
     │                                        ▼
     │                              GmailMessage[] → BaseContent[]
     │                                        │
     │                                        ▼
     │                              WorkflowBuilder (dynamic steps based on config)
     │                                        │
     │                                        ▼
     │                              BaseContent[] → ProcessedItem[]
     │                                        │
     ▼                                        ▼
GET /api/workflows/:taskId ◄──────── Task status + result stored
     │
     ▼
SDK polls until completed, fires onComplete({ processedItems })
     │
     ▼
CLI displays results
```

## Key Types

### WorkflowFilter (SDK)

```typescript
interface WorkflowFilter {
  email?: string; // Filter by sender email
  limitDays?: number; // Only fetch emails from last N days
  withUrl?: boolean; // Only include emails containing URLs
}
```

### ProcessedItem (SDK & API)

```typescript
interface ProcessedItem {
  id: string;
  url: string;
  sourceAdapter: string;
  tags: string[];
  summary?: string;
  rawContent?: string;
}
```

## Available Presets

Presets define base step configurations, but actual steps are dynamically determined based on runtime options like `saveTo` and `skipAnalysis`.

| Preset         | Description                       | Base Steps                       | Dynamic Behavior                                  |
| -------------- | --------------------------------- | -------------------------------- | ------------------------------------------------- |
| `gmail`        | Gmail workflow                    | Read → Analyze                   | `saveTo=database` → SaveToDatabase, else → Export |
| `bookmark`     | Bookmark workflow                 | Read → Analyze → Enrich          | Enriches Twitter links                            |
| `analyzeOnly`  | Only extract and analyze          | Read → Analyze                   | No export step                                    |
| `twitterFocus` | Always include Twitter enrichment | Read → Analyze → Enrich → Export | Always enriches                                   |
| `csvOnly`      | Force CSV export only             | Read → Export (CSV)              | Skips analysis                                    |

### Dynamic Step Selection (Gmail Preset Example)

```
createSteps(config) {
    steps = [ReadStep]

    if (!config.skipAnalysis)
        steps.push(AnalyzeStep)

    if (config.saveTo === 'database')
        steps.push(SaveToBookmarkStep)    // Save to PostgreSQL
    else if (!config.saveTo)
        steps.push(ExportStep)            // Export to CSV/Notion

    return steps
}
```

## CLI Usage

```bash
# Basic Gmail workflow (last 7 days, output to console)
bun run cli list source gmail

# Filter by sender email
bun run cli list source gmail --filter=newsletter@example.com

# Limit to last 3 days
bun run cli list source gmail --limit-days=3

# Only emails containing URLs
bun run cli list source gmail --with-url

# Save to database instead of console
bun run cli list source gmail --save-to=database

# Save to CSV file
bun run cli list source gmail --save-to=csv

# Combined filters with save destination
bun run cli list source gmail -f newsletter@example.com -l 7 -u -s database
```

## Save Destinations

| Destination | Description                 |
| ----------- | --------------------------- |
| `console`   | Output to console (default) |
| `database`  | Save to PostgreSQL database |
| `csv`       | Export to CSV file          |
| `notion`    | Save to Notion database     |

## Hexagonal Architecture Layers

The workflow follows hexagonal architecture:

1. **Domain Layer** (`@abeauvois/platform-domain`)
   - `BackgroundTaskService` - orchestrates background tasks
   - `BackgroundTask` - task entity
   - `IBackgroundTaskRepository` - port for task persistence
   - `Bookmark` - bookmark entity for database saves

2. **Application Layer** (`tasks/workers/`)
   - `presets.ts` - workflow configurations with dynamic step factories
   - `workflow.steps.ts` - step implementations:
     - `ReadStep` - fetches items from source
     - `AnalyzeStep` - AI-powered content analysis
     - `EnrichStep` - Twitter link enrichment
     - `ExportStep` - CSV/Notion export
     - `SaveToBookmarkStep` - saves to PostgreSQL via bookmark repository

3. **Infrastructure Layer** (`infrastructure/`)
   - `GmailApiClient` - Gmail API adapter
   - `DrizzleBackgroundTaskRepository` - task persistence adapter
   - `DrizzleBookmarkRepository` - bookmark persistence adapter
   - `InMemoryBookmarkRepository` - in-memory adapter for testing

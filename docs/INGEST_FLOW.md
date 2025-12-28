# Ingest Flow

This document describes the data flow for content ingestion from CLI to background task.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLI LAYER                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  apps/cli/commands/list/gmail.ts                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  gmailCommand                                                       │        │
│  │  • Parses flags: --filter, --limitDays, --withUrl                   │        │
│  │  • Creates filter: { email?, limitDays?, withUrl? }                 │        │
│  │  • Calls: ctx.apiClient.ingest.create('gmail', { filter })          │        │
│  └──────────────────────────────┬──────────────────────────────────────┘        │
│                                 │                                               │
└─────────────────────────────────┼───────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SDK LAYER                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  packages/platform-sdk/src/IngestWorkflow.ts                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  IngestWorkflow.execute()                                           │        │
│  │  const { preset, options, logger } = this.config;                   │        │
│  │  • POST /api/ingest → startTask()                                   │        │
│  │  • GET /api/ingest/:taskId → pollTaskStatus() (loops until done)    │        │
│  │  • Fires hooks: onStart, onItemProcessed, onComplete, onError       │        │
│  └──────────────────────────────┬──────────────────────────────────────┘        │
│                                 │                                               │
│  packages/platform-sdk/src/types.ts                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  IngestFilter { email?, limitDays?, withUrl? }                      │        │
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
│  apps/api/server/validators/ingest.validator.ts                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  ingestSchema (Zod)                                                 │        │
│  │  • Validates: preset, filter { email?, limitDays?, withUrl? }       │        │
│  └──────────────────────────────┬──────────────────────────────────────┘        │
│                                 │                                               │
│  apps/api/server/routes/ingest.routes.ts                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  POST /api/ingest                                                   │        │
│  │  • Creates taskId via DataIngestionService                          │        │
│  │  • Enqueues task to pg-boss queue                                   │        │
│  │  • Returns { taskId, status: 'pending' }                            │        │
│  │                                                                     │        │
│  │  GET /api/ingest/:taskId                                            │        │
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
│  apps/api/server/tasks/workers/ingest.worker.ts                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  processIngestTask()                                                │        │
│  │  • Gets SourceReader for preset (e.g., createGmailSourceReader)     │        │
│  │  • Builds WorkflowBuilder with steps:                               │        │
│  │      ReadStep → AnalyzeStep → EnrichStep → ExportStep               │        │
│  │  • Converts BaseContent[] → ProcessedItem[]                         │        │
│  └──────────────────────────────┬──────────────────────────────────────┘        │
│                                 │                                               │
│  apps/api/server/tasks/workers/presets.ts                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  Preset configurations (gmail, full, quick, analyzeOnly, etc.)      │        │
│  │  • createSourceReader() - returns ISourceReader for the preset      │        │
│  │  • createSteps() - returns workflow steps for the preset            │        │
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
│  apps/api/server/infrastructure/DrizzleIngestionTaskRepository.ts               │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  DrizzleIngestionTaskRepository implements IIngestionTaskRepository │        │
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
IngestFilter { email, limitDays, withUrl }
     │
     ▼
POST /api/ingest ──► pg-boss queue ──► Worker picks up task
     │                                        │
     │                                        ▼
     │                              GmailApiClient.fetchMessagesSince()
     │                                        │
     │                                        ▼
     │                              GmailMessage[] → BaseContent[]
     │                                        │
     │                                        ▼
     │                              WorkflowBuilder (Read→Analyze→Enrich→Export)
     │                                        │
     │                                        ▼
     │                              BaseContent[] → ProcessedItem[]
     │                                        │
     ▼                                        ▼
GET /api/ingest/:taskId ◄──────── Task status + result stored
     │
     ▼
SDK polls until completed, fires onComplete({ processedItems })
     │
     ▼
CLI displays results
```

## Key Types

### IngestFilter (SDK)

```typescript
interface IngestFilter {
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

| Preset | Description | Steps |
|--------|-------------|-------|
| `gmail` | Gmail ingestion | Read → Analyze → Enrich → Export |
| `full` | Full workflow with all steps | Read → Analyze → Enrich → Export |
| `quick` | Skip enrichment | Read → Analyze → Export |
| `analyzeOnly` | Only extract and analyze | Read → Analyze |
| `twitterFocus` | Always include Twitter enrichment | Read → Analyze → Enrich → Export |
| `csvOnly` | Force CSV export only | Read → Analyze → Enrich → Export (CSV) |

## CLI Usage

```bash
# Basic Gmail ingestion (last 7 days)
bun run cli list source gmail

# Filter by sender email
bun run cli list source gmail --filter=newsletter@example.com

# Limit to last 3 days
bun run cli list source gmail --limit-days=3

# Only emails containing URLs
bun run cli list source gmail --with-url

# Combined filters
bun run cli list source gmail -f newsletter@example.com -l 7 -u
```

## Hexagonal Architecture Layers

The ingestion flow follows hexagonal architecture:

1. **Domain Layer** (`@platform/platform-domain`)
   - `DataIngestionService` - orchestrates ingestion
   - `IngestionTask` - task entity
   - `IIngestionTaskRepository` - port for task persistence

2. **Application Layer** (`tasks/workers/`)
   - `presets.ts` - workflow configurations
   - `workflow.steps.ts` - step implementations

3. **Infrastructure Layer** (`infrastructure/`)
   - `GmailApiClient` - Gmail API adapter
   - `DrizzleIngestionTaskRepository` - database adapter

# Gmail Ingest Flow

This document describes the data flow for Gmail ingestion from CLI to background task.

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
│  │  • POST /api/ingest → startJob()                                    │        │
│  │  • GET /api/ingest/:taskId → pollJobStatus() (loops until done)     │        │
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
│  │  • Creates taskId                                                   │        │
│  │  • Enqueues job to pg-boss queue                                    │        │
│  │  • Returns { taskId, status: 'pending' }                            │        │
│  │                                                                     │        │
│  │  GET /api/ingest/:taskId                                            │        │
│  │  • Returns job status + progress + result                           │        │
│  └──────────────────────────────┬──────────────────────────────────────┘        │
│                                 │                                               │
└─────────────────────────────────┼───────────────────────────────────────────────┘
                                  │ pg-boss queue
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BACKGROUND WORKER                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  apps/api/server/jobs/workers/ingest.worker.ts                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  processIngestJob()                                                 │        │
│  │  • Gets SourceReader for preset (e.g., createGmailSourceReader)     │        │
│  │  • Builds WorkflowBuilder with steps:                               │        │
│  │      ExtractStep → AnalyzeStep → EnrichStep → ExportStep            │        │
│  │  • Converts Bookmark[] → ProcessedItem[] via bookmarkToProcessedItem│        │
│  └──────────────────────────────┬──────────────────────────────────────┘        │
│                                 │                                               │
│  createGmailSourceReader()                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  ISourceReader.ingest(config)                                       │        │
│  │  • Calls gmailClient.fetchMessagesSince(since, email, withUrl)      │        │
│  │  • Converts GmailMessage[] → BaseContent[]                          │        │
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
POST /api/ingest ──► pg-boss queue ──► Worker picks up job
     │                                        │
     │                                        ▼
     │                              GmailApiClient.fetchMessagesSince()
     │                                        │
     │                                        ▼
     │                              GmailMessage[] → BaseContent[]
     │                                        │
     │                                        ▼
     │                              WorkflowBuilder (Extract→Analyze→Enrich→Export)
     │                                        │
     │                                        ▼
     │                              Bookmark[] → ProcessedItem[]
     │                                        │
     ▼                                        ▼
GET /api/ingest/:taskId ◄──────── Job status + result stored
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
    email?: string;      // Filter by sender email
    limitDays?: number;  // Only fetch emails from last N days
    withUrl?: boolean;   // Only include emails containing URLs
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

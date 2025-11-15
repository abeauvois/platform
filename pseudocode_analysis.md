# ExtractLinksUseCase Pseudocode Analysis

## Main Workflow Pseudocode

```
MAIN WORKFLOW: ExtractLinksUseCase.execute()

1. EXTRACT EMAIL FILES
   - Input: zipFilePath
   - Process:
     * Extract all .eml files from zip/directory
     * Return map of filename -> email content
   - Output: Map<String, String> emailFiles

2. PARSE EMAIL LINKS
   - Input: emailFiles (from step 1)
   - Process:
     * For each email file:
       - Extract links from email content
       - Take first link (main link)
       - Create EmailLink object
       - Log results
   - Output: EmailLink[] emailLinks

3. ANALYZE LINKS WITH AI
   - Input: emailLinks (from step 2)
   - Process:
     * For each emailLink:
       * Check if Twitter URL
       * If Twitter:
         - Fetch tweet content
         - If rate limited: queue for retry
       * Analyze link with AI (with optional tweet content)
       * Categorize link
     * Return categorized links + retry queue
   - Output:
     * EmailLink[] categorizedLinks
     * QueuedLink[] retryQueue

4. HANDLE RESULTS
   IF retryQueue NOT empty:
     - WAIT for rate limit reset (with countdown)
     - RETRY queued Twitter links
     - UPDATE categorized links with enriched results
     - EXPORT final results to CSV + Notion
   ELSE:
     - EXPORT results directly to CSV + Notion

5. EXPORT RESULTS
   - Write categorized links to CSV
   - Export links to Notion database
   - Update any enriched entries in Notion
```

## Key Process Breakdown

### Link Analysis Process

```
FOR each link in emailLinks:
  1. TRUNCATE URL for logging
  2. IF Twitter URL:
     - Try to fetch tweet content
     - Log success/failure
  3. ANALYZE link (with tweet content if available)
  4. CATEGORIZE link with AI
  5. IF Twitter + Unknown + No content + Rate Limited:
     - ADD to retry queue
  6. LOG result

RETURN categorized links + retry queue
```

### Rate Limit Retry Process

```
1. CALCULATE wait time from rate limit reset
2. IF wait time > 15 minutes:
   - SKIP retry (too long)
   - Export with existing results
3. ELSE:
   - START countdown timer
   - WAIT for reset + 5s buffer
   - CLEAR rate limit flag
   - RETRY queued links:
     * Fetch tweet content
     * Re-analyze with content
     * UPDATE categorized links
   - UPDATE CSV + Notion with results
```

## Data Flow Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Zip File      │───▶│  Email Files     │───▶│   Email Links   │
│   (.zip/.dir)   │    │   (.eml files)   │    │   (URLs only)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CSV Export    │◀───│ Categorized      │◀───│   AI Analysis   │
│   + Notion      │    │   Links          │    │   + Retry       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Current Issues Identified

1. **Long method complexity** - `execute()` has 30+ lines, multiple responsibilities
2. **Tight coupling** - Retry logic mixed with main workflow
3. **Magic numbers** - 15min, 5s buffer, 10s countdown intervals
4. **Complex async handling** - Nested promises and error handling
5. **Mixed concerns** - Rate limiting logic intertwined with business logic
6. **Hard to test** - Single large class with multiple dependencies
7. **Sequential processing** - No parallelism for independent operations
8. **No retry re-queuing** - URLs that fail with 429 during retry are not re-queued

---

## Visual Diagram Suggestions

### 1. Flowchart Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      MAIN EXECUTION FLOW                        │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Extract Emails  │───▶│  Parse Links    │───▶│ Analyze Links   │
│   (IO-bound)    │    │  (Parse)        │    │ (AI + Web API)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                    │                        │
                                    ▼                        ▼
┌─────────────────────────────────┐    ┌─────────────────────┐
│        Export Results           │◀───│ Handle Retry Queue  │
│    (CSV + Notion)               │    │   (if needed)       │
└─────────────────────────────────┘    └─────────────────────┘
```

### 2. State Diagram for Link Processing

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Email Link  │───▶│ Twitter URL? │───▶│ Fetch Tweet │
│   Found     │    │              │    │   Content   │
└─────────────┘    └──────────────┘    └─────────────┘
                              │                  │
                              │ NO               │ YES
                              ▼                  ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │   AI Analyze    │    │ Rate Limited?   │
                    │ (URL only)      │    │                 │
                    └─────────────────┘    └────────┬────────┘
                              │                  │
                              ▼                  │
                    ┌─────────────────┐          │ YES
                    │   Unknown?      │          │
                    └────────┬────────┘          ▼
                              │          ┌─────────────────┐
                              │ NO        │   Add to Retry  │
                              │          │     Queue       │
                              ▼          └─────────────────┘
                    ┌─────────────────┐
                    │   Categorize    │
                    │     Link        │
                    └─────────────────┘
```

### 3. Component Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTRACT LINKS USE CASE                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Zip Extractor   │  │ Email Parser │  │ Link Analyzer   │   │
│  │ (IO)            │  │ (Parse)      │  │ (AI)            │   │
│  └─────────────────┘  └──────────────┘  └─────────────────┘   │
│                                                                 │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Tweet Scraper   │  │ CSV Writer   │  │ Notion Writer   │   │
│  │ (Web API)       │  │ (IO)         │  │ (API)           │   │
│  └─────────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Rate Limit    │
                    │   Handler       │
                    └─────────────────┘
```

### 4. Retry Mechanism Current vs. Improved

**Current Behavior:**

```
Initial Analysis → 429 Error → Add to Queue → Wait for Reset → Retry Once
                                                                    │
                                                              Success | 429 Again
                                                                    │
                                                              ✓ Done | ✗ Abandon
```

**Improved Behavior:**

```
Initial Analysis → 429 Error → Add to Queue (attempt=0)
                                       │
                                       ▼
                         Wait for Reset (with buffer)
                                       │
                                       ▼
                         Retry (attempt++)
                                       │
                          ┌────────────┴────────────┐
                          │                         │
                     Success                   429 Again
                          │                         │
                      ✓ Done                   attempt < MAX?
                                                    │
                                          ┌─────────┴─────────┐
                                         YES                 NO
                                          │                   │
                                Re-queue with                  │
                                new reset time               ✗ Abandon
```

---

## Refactoring Plan

### Phase 1: Extract Constants and Configuration (High Priority)

**Problem**: Magic numbers scattered throughout code make maintenance difficult.

**Solution**: Create a configuration class

```typescript
// src/application/config/ExtractLinksConfig.ts
export class ExtractLinksConfig {
  static readonly RATE_LIMIT = {
    MAX_WAIT_SECONDS: 15 * 60,
    BUFFER_MS: 5000,
    COUNTDOWN_INTERVAL: 10,
    MAX_RETRY_ATTEMPTS: 3,
  };

  static readonly LINK = {
    MAX_LOG_LENGTH: 80,
  };

  static readonly CONCURRENCY = {
    MAX_PARALLEL_ANALYSIS: 5,
  };
}
```

### Phase 2: Create Specialized Service Classes (High Priority)

**Problem**: Single class with 300+ lines and multiple responsibilities.

**Solution**: Break into focused services

#### 2.1 Email Extraction Service

```typescript
// src/application/services/EmailExtractionService.ts
export class EmailExtractionService {
  constructor(
    private readonly zipExtractor: IZipExtractor,
    private readonly LinksExtractor: ILinksExtractor,
    private readonly logger: ILogger
  ) {}

  async extractAndParseEmails(zipFilePath: string): Promise<EmailLink[]> {
    const emailFiles = await this.extractFiles(zipFilePath);
    return this.parseLinks(emailFiles);
  }

  private async extractFiles(
    zipFilePath: string
  ): Promise<Map<string, string>> {
    this.logger.info("📦 Extracting .eml files from zip...");
    const emailFiles = await this.zipExtractor.extractEmlFiles(zipFilePath);
    this.logger.info(`✅ Found ${emailFiles.size} email files`);
    return emailFiles;
  }

  private parseLinks(emailFiles: Map<string, string>): EmailLink[] {
    // Extraction logic here
  }
}
```

#### 2.2 Link Analysis Service

```typescript
// src/application/services/LinkAnalysisService.ts
export interface AnalysisResult {
  categorizedLinks: EmailLink[];
  retryQueue: QueuedLink[];
}

export class LinkAnalysisService {
  constructor(
    private readonly linkAnalyzer: ILinkAnalyzer,
    private readonly tweetScraper: ITweetScraper,
    private readonly logger: ILogger
  ) {}

  async analyzeLinks(links: EmailLink[]): Promise<AnalysisResult> {
    const categorizedLinks: EmailLink[] = [];
    const retryQueue: QueuedLink[] = [];

    for (let i = 0; i < links.length; i++) {
      const result = await this.analyzeSingleLink(links[i]);
      categorizedLinks.push(result.categorized);

      if (result.shouldRetry) {
        retryQueue.push({
          link: links[i],
          index: categorizedLinks.length - 1,
          attempts: 0,
        });
      }
    }

    return { categorizedLinks, retryQueue };
  }

  private async analyzeSingleLink(link: EmailLink): Promise<{
    categorized: EmailLink;
    shouldRetry: boolean;
  }> {
    // Analysis logic
  }
}
```

#### 2.3 Improved Retry Handler Service

```typescript
// src/application/services/RetryHandlerService.ts
export interface QueuedLinkWithAttempts extends QueuedLink {
  attempts: number;
}

export class RetryHandlerService {
  constructor(
    private readonly tweetScraper: ITweetScraper,
    private readonly linkAnalyzer: ILinkAnalyzer,
    private readonly logger: ILogger,
    private readonly maxAttempts: number = 3
  ) {}

  async handleRetryQueue(
    retryQueue: QueuedLinkWithAttempts[],
    categorizedLinks: EmailLink[]
  ): Promise<{
    updatedUrls: Set<string>;
    remainingQueue: QueuedLinkWithAttempts[];
  }> {
    const waitSeconds = this.getRateLimitWaitTime();

    if (waitSeconds > ExtractLinksConfig.RATE_LIMIT.MAX_WAIT_SECONDS) {
      this.logger.warning(`⚠️  Wait time exceeds limit. Skipping retry.`);
      return { updatedUrls: new Set(), remainingQueue: [] };
    }

    await this.waitForRateLimitReset();
    return await this.retryQueuedLinks(retryQueue, categorizedLinks);
  }

  private async retryQueuedLinks(
    retryQueue: QueuedLinkWithAttempts[],
    categorizedLinks: EmailLink[]
  ): Promise<{
    updatedUrls: Set<string>;
    remainingQueue: QueuedLinkWithAttempts[];
  }> {
    const updatedUrls = new Set<string>();
    const remainingQueue: QueuedLinkWithAttempts[] = [];

    for (const queuedLink of retryQueue) {
      const result = await this.retryLink(queuedLink);

      if (result.success && result.enriched) {
        categorizedLinks[queuedLink.index] = result.enriched;
        updatedUrls.add(queuedLink.link.url);
      } else if (
        result.shouldRetryAgain &&
        queuedLink.attempts < this.maxAttempts
      ) {
        remainingQueue.push({
          ...queuedLink,
          attempts: queuedLink.attempts + 1,
        });
      }
    }

    return { updatedUrls, remainingQueue };
  }

  private async retryLink(queuedLink: QueuedLinkWithAttempts): Promise<{
    success: boolean;
    enriched: EmailLink | null;
    shouldRetryAgain: boolean;
  }> {
    try {
      const tweetContent = await this.tweetScraper.fetchTweetContent(
        queuedLink.link.url
      );

      if (!tweetContent) {
        return {
          success: false,
          enriched: null,
          shouldRetryAgain: this.tweetScraper.isRateLimited(),
        };
      }

      const analysis = await this.linkAnalyzer.analyze(
        queuedLink.link.url,
        tweetContent
      );
      const enriched = queuedLink.link.withCategorization(
        analysis.tag,
        analysis.description
      );

      return { success: true, enriched, shouldRetryAgain: false };
    } catch (error) {
      this.logger.error(`Retry failed: ${error}`);
      return { success: false, enriched: null, shouldRetryAgain: false };
    }
  }
}
```

#### 2.4 Export Service

```typescript
// src/application/services/ExportService.ts
export class ExportService {
  constructor(
    private readonly csvWriter: ICsvWriter,
    private readonly notionWriter: INotionWriter,
    private readonly logger: ILogger
  ) {}

  async exportResults(
    links: EmailLink[],
    outputCsvPath: string,
    notionDatabaseId: string,
    updatedUrls?: Set<string>
  ): Promise<void> {
    await this.exportToCsv(links, outputCsvPath);
    await this.exportToNotion(links, notionDatabaseId, updatedUrls);
  }

  private async exportToCsv(links: EmailLink[], path: string): Promise<void> {
    this.logger.info("\n💾 Writing results to CSV...");
    await this.csvWriter.write(links, path);
    this.logger.info(`✅ CSV export complete! Output saved to: ${path}`);
  }

  private async exportToNotion(
    links: EmailLink[],
    databaseId: string,
    updatedUrls?: Set<string>
  ): Promise<void> {
    this.logger.info("\n📝 Exporting to Notion...");
    try {
      await this.notionWriter.write(links, databaseId);

      if (updatedUrls && updatedUrls.size > 0) {
        await this.notionWriter.updatePages(links, databaseId, updatedUrls);
      }

      this.logger.info(`✅ Notion export complete!`);
    } catch (error) {
      this.logger.error(
        `❌ Notion export failed: ${
          error instanceof Error ? error.message : error
        }`
      );
      this.logger.info(
        "Note: CSV export was successful. Only Notion export failed."
      );
    }
  }
}
```

### Phase 3: Create Main Orchestrator (Medium Priority)

**Problem**: Complex workflow management in a single method.

**Solution**: Clean orchestrator class

```typescript
// src/application/ExtractLinksOrchestrator.ts
export class ExtractLinksOrchestrator {
  constructor(
    private readonly extractionService: EmailExtractionService,
    private readonly analysisService: LinkAnalysisService,
    private readonly retryHandler: RetryHandlerService,
    private readonly exportService: ExportService,
    private readonly logger: ILogger
  ) {}

  async execute(
    zipFilePath: string,
    outputCsvPath: string,
    notionDatabaseId: string
  ): Promise<void> {
    // 1. Extract and parse emails
    const emailLinks = await this.extractionService.extractAndParseEmails(
      zipFilePath
    );

    // 2. Analyze links
    const { categorizedLinks, retryQueue } =
      await this.analysisService.analyzeLinks(emailLinks);

    // 3. Handle retries with recursive logic for multiple attempts
    let updatedUrls = new Set<string>();
    if (retryQueue.length > 0) {
      updatedUrls = await this.handleRetries(retryQueue, categorizedLinks);
    }

    // 4. Export final results
    await this.exportService.exportResults(
      categorizedLinks,
      outputCsvPath,
      notionDatabaseId,
      updatedUrls
    );

    this.logger.info("\n✅ All done!");
  }

  private async handleRetries(
    initialQueue: QueuedLinkWithAttempts[],
    categorizedLinks: EmailLink[]
  ): Promise<Set<string>> {
    let queue = initialQueue;
    const allUpdatedUrls = new Set<string>();

    while (queue.length > 0) {
      const { updatedUrls, remainingQueue } =
        await this.retryHandler.handleRetryQueue(queue, categorizedLinks);

      updatedUrls.forEach((url) => allUpdatedUrls.add(url));

      if (
        remainingQueue.length === 0 ||
        remainingQueue.length === queue.length
      ) {
        // No progress made, stop retrying
        break;
      }

      queue = remainingQueue;
    }

    return allUpdatedUrls;
  }
}
```

### Phase 4: Apply Design Patterns (Medium Priority)

#### 4.1 Strategy Pattern for Link Analysis

```typescript
interface LinkAnalysisStrategy {
  canHandle(url: string): boolean;
  analyze(link: EmailLink): Promise<EmailLink>;
}

class TwitterAnalysisStrategy implements LinkAnalysisStrategy {
  canHandle(url: string): boolean {
    return ExtractLinksUseCase.isTwitterUrl(url);
  }

  async analyze(link: EmailLink): Promise<EmailLink> {
    // Twitter-specific logic with content enrichment
  }
}

class GeneralLinkAnalysisStrategy implements LinkAnalysisStrategy {
  canHandle(url: string): boolean {
    return true; // Default fallback
  }

  async analyze(link: EmailLink): Promise<EmailLink> {
    // General analysis logic
  }
}
```

#### 4.2 Observer Pattern for Progress Tracking

```typescript
interface ProgressObserver {
  onStageStart(stage: string, totalItems: number): void;
  onProgress(stage: string, current: number, total: number): void;
  onStageComplete(stage: string): void;
  onError(stage: string, error: Error): void;
}

class ConsoleProgressObserver implements ProgressObserver {
  onStageStart(stage: string, totalItems: number): void {
    console.log(`\n🔄 Starting ${stage} (${totalItems} items)...`);
  }

  onProgress(stage: string, current: number, total: number): void {
    console.log(`  [${current}/${total}] Processing...`);
  }

  onStageComplete(stage: string): void {
    console.log(`✅ ${stage} complete!`);
  }

  onError(stage: string, error: Error): void {
    console.error(`❌ Error in ${stage}: ${error.message}`);
  }
}
```

### Phase 5: Add Concurrency Support (Low Priority)

**Problem**: Sequential processing is slow for independent operations.

**Solution**: Parallel processing with controlled concurrency

```typescript
class ConcurrentLinkAnalysisService extends LinkAnalysisService {
  constructor(
    linkAnalyzer: ILinkAnalyzer,
    tweetScraper: ITweetScraper,
    logger: ILogger,
    private readonly maxConcurrency: number = 5
  ) {
    super(linkAnalyzer, tweetScraper, logger);
  }

  async analyzeLinks(links: EmailLink[]): Promise<AnalysisResult> {
    const categorizedLinks: EmailLink[] = [];
    const retryQueue: QueuedLink[] = [];

    // Process in chunks for controlled concurrency
    for (let i = 0; i < links.length; i += this.maxConcurrency) {
      const chunk = links.slice(i, i + this.maxConcurrency);
      const results = await Promise.all(
        chunk.map((link) => this.analyzeSingleLink(link))
      );

      results.forEach((result, idx) => {
        categorizedLinks.push(result.categorized);
        if (result.shouldRetry) {
          retryQueue.push({
            link: chunk[idx],
            index: categorizedLinks.length - 1,
            attempts: 0,
          });
        }
      });
    }

    return { categorizedLinks, retryQueue };
  }
}
```

### Benefits of Refactoring

1. **Single Responsibility**: Each class has one clear purpose
2. **Testability**: Services can be unit tested independently
3. **Reusability**: Services can be composed differently for new use cases
4. **Maintainability**: Changes isolated to specific services
5. **Resilience**: Improved retry logic with multiple attempts
6. **Performance**: Optional parallel processing for independent operations
7. **Flexibility**: Strategy pattern allows different analysis approaches
8. **Observability**: Progress tracking via observer pattern
9. **Configuration**: Centralized constants for easy tuning

### Implementation Priority

#### Immediate (Week 1)

1. Extract configuration constants
2. Fix retry re-queuing issue
3. Add attempt counter to QueuedLink interface

#### High Priority (Week 2-3)

1. Create service classes (Extraction, Analysis, Export)
2. Implement improved RetryHandlerService with re-queuing
3. Create orchestrator class
4. Update tests

#### Medium Priority (Week 4)

1. Implement Strategy pattern for link analysis
2. Add Observer pattern for progress tracking
3. Improve error handling and logging

#### Low Priority (Future)

1. Add concurrent processing capability
2. Implement exponential backoff
3. Add metrics collection
4. Create dashboard for monitoring

### Migration Strategy

1. **Backward Compatibility**: Keep ExtractLinksUseCase as facade
2. **Incremental Migration**: Move one service at a time
3. **Feature Flags**: Control new behavior via configuration
4. **Parallel Testing**: Run both old and new implementations
5. **Gradual Rollout**: Deploy to subset of users first
6. **Monitor**: Track errors and performance metrics
7. **Final Cutover**: Remove old implementation once stable

### Risks and Mitigation

| Risk                       | Impact | Mitigation                      |
| -------------------------- | ------ | ------------------------------- |
| Breaking existing behavior | High   | Comprehensive integration tests |
| Performance regression     | Medium | Benchmark before/after          |
| Retry loops                | Medium | Max attempts limit + monitoring |
| Increased complexity       | Low    | Clear documentation + examples  |
| API rate limits            | High   | Rate limit tracking + backoff   |

---

## Summary

This refactoring transforms a monolithic 300-line class into a modular, testable, and maintainable architecture. The key improvements are:

- **Better retry handling**: Multiple attempts with re-queuing
- **Separation of concerns**: Each service has one job
- **Improved testability**: Mock dependencies easily
- **Enhanced resilience**: Better error handling
- **Future-proof**: Easy to add new features

The phased approach allows incremental implementation while maintaining system stability.

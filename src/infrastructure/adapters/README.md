# Infrastructure Adapters

This directory contains the concrete implementations (adapters) of the domain ports, following the Hexagonal Architecture pattern.

## CachedHttpClient

A generic, reusable HTTP client with built-in caching, throttling, and retry logic.

### Features

- **Request Throttling**: Prevents hitting API rate limits by enforcing minimum time between requests
- **In-Memory Caching**: Stores responses with optional TTL (Time-To-Live)
- **Automatic Retries**: Configurable retry logic with exponential backoff
- **Rate Limit Tracking**: Detects and respects HTTP 429 responses
- **Type-Safe**: Fully typed with TypeScript generics

### Basic Usage

```typescript
import { CachedHttpClient } from "./CachedHttpClient.js";
import { CliuiLogger } from "./CliuiLogger.js";

// Create a client for JSON data
const logger = new CliuiLogger();
const client = new CachedHttpClient<any>(logger, {
  throttleMs: 1000, // Wait 1 second between requests
  retries: 3, // Retry up to 3 times
  cacheTtl: 3600000, // Cache for 1 hour
});

// Fetch data
const data = await client.fetch("unique-cache-key", async () => {
  const response = await fetch("https://api.example.com/data");
  if (!response.ok) {
    const error: any = new Error(`API error: ${response.status}`);
    error.status = response.status;
    error.headers = response.headers;
    throw error;
  }
  return response.json();
});
```

### Configuration Options

```typescript
interface CachedHttpClientOptions {
  // Minimum time between requests (ms)
  throttleMs?: number; // Default: 1000

  // Maximum retry attempts
  retries?: number; // Default: 2

  // Cache expiration time (ms), 0 = no expiration
  cacheTtl?: number; // Default: 0

  // Custom retry delay function
  retryDelay?: (attempt: number) => number;

  // Custom retry decision function
  shouldRetry?: (error: any, attempt: number) => boolean;
}
```

### Advanced Usage

#### Custom Retry Strategy

```typescript
const client = new CachedHttpClient(logger, {
  retries: 5,
  retryDelay: (attempt) => {
    // Custom backoff: 2s, 4s, 8s, 16s, 32s
    return Math.min(2000 * Math.pow(2, attempt), 32000);
  },
  shouldRetry: (error, attempt) => {
    // Only retry on network errors
    return !error.status;
  },
});
```

#### Per-Request Options Override

```typescript
// Override options for a specific request
const data = await client.fetch("cache-key", fetcher, {
  throttleMs: 5000, // Wait 5 seconds for this specific request
  retries: 0, // Don't retry this request
});
```

#### Cache Management

```typescript
// Clear a specific cache entry
client.clearCache("cache-key");

// Clear all cached data
client.clearAllCache();

// Check if rate limited
if (client.isRateLimited()) {
  const resetTime = client.getRateLimitResetTime();
  console.log(`Rate limited until: ${new Date(resetTime)}`);
}
```

### Error Handling

The client throws errors with additional properties for easier handling:

```typescript
try {
  const data = await client.fetch("key", fetcher);
} catch (error: any) {
  console.log("Status:", error.status); // HTTP status code
  console.log("Headers:", error.headers); // Response headers
  console.log("Message:", error.message); // Error message
}
```

### Rate Limiting

The client automatically handles HTTP 429 responses:

1. Extracts `x-rate-limit-reset` header
2. Prevents further requests until reset time
3. Logs remaining time to reset
4. Returns `null` instead of throwing

### TwitterScraper Example

The `TwitterScraper` uses `CachedHttpClient` internally:

```typescript
export class TwitterScraper implements ITweetScraper {
  private readonly httpClient: CachedHttpClient<string>;

  constructor(bearerToken: string, logger: ILogger, throttleMs = 1000) {
    this.httpClient = new CachedHttpClient<string>(logger, {
      throttleMs,
      retries: 2,
      cacheTtl: 0, // No expiration
    });
  }

  async fetchTweetContent(url: string): Promise<string | null> {
    const tweetId = this.extractTweetId(url);
    return await this.httpClient.fetch(
      tweetId,
      async () => await this.fetchTweetFromApi(tweetId)
    );
  }
}
```

### Benefits Over Manual Implementation

1. **Separation of Concerns**: HTTP mechanics separated from business logic
2. **Reusability**: Can be used for any HTTP API (Twitter, Notion, etc.)
3. **Consistency**: Same behavior across all HTTP calls
4. **Testability**: Easy to mock and test
5. **Maintainability**: Changes to retry/cache logic in one place
6. **Type Safety**: Full TypeScript support with generics

### Default Behavior

- **Throttling**: 1 second between requests
- **Retries**: 2 attempts with exponential backoff (1s, 2s)
- **Cache TTL**: No expiration (0)
- **Retry Logic**: Retries on 5xx errors, not on auth errors (401, 403)
- **Rate Limits**: Automatically tracks 429 responses

## Other Adapters

- **TwitterScraper**: Uses CachedHttpClient for Twitter API v2
- **AnthropicAnalyzer**: AI-powered link analysis
- **NotionDatabaseWriter**: Writes to Notion databases
- **CsvFileWriter**: Writes CSV files
- **CliuiLogger**: Console logging with colors

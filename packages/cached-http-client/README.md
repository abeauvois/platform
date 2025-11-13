# @myorg/cached-http-client

A generic, type-safe HTTP client with built-in caching, throttling, and retry logic for Node.js/Bun applications.

## Features

- ✅ **Request Throttling** - Prevents hitting API rate limits
- ✅ **In-Memory Caching** - Optional TTL-based caching
- ✅ **Automatic Retries** - Configurable exponential backoff
- ✅ **Rate Limit Tracking** - Detects and respects HTTP 429 responses
- ✅ **Type-Safe** - Full TypeScript support with generics
- ✅ **Zero Dependencies** - Pure Node.js/Bun implementation
- ✅ **Flexible Logging** - Bring your own logger implementation

## Installation

```bash
# Using Bun
bun add @myorg/cached-http-client

# Using npm
npm install @myorg/cached-http-client

# Using yarn
yarn add @myorg/cached-http-client
```

## Quick Start

```typescript
import { CachedHttpClient, type ILogger } from "@myorg/cached-http-client";

// Implement the logger interface
const logger: ILogger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warning: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

// Create a client
const client = new CachedHttpClient<any>(logger, {
  throttleMs: 1000, // Wait 1 second between requests
  retries: 3, // Retry up to 3 times
  cacheTtl: 60000, // Cache for 1 minute
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

console.log(data);
```

## API Reference

### `CachedHttpClient<T>`

Generic HTTP client class with caching and retry logic.

#### Constructor

```typescript
constructor(logger: ILogger, options?: CachedHttpClientOptions)
```

**Parameters:**

- `logger`: Implementation of the `ILogger` interface
- `options`: Optional configuration (see Configuration Options below)

#### Methods

##### `fetch(key, fetcher, options?)`

Fetch data with caching, throttling, and retry logic.

```typescript
async fetch(
  key: string,
  fetcher: () => Promise<T>,
  options?: Partial<CachedHttpClientOptions>
): Promise<T | null>
```

**Parameters:**

- `key`: Unique cache key for this request
- `fetcher`: Function that performs the actual HTTP request
- `options`: Optional per-request configuration to override defaults

**Returns:** The fetched data or `null` if all attempts fail

##### `clearCache(key)`

Clear a specific cache entry.

```typescript
clearCache(key: string): void
```

##### `clearAllCache()`

Clear all cached data.

```typescript
clearAllCache(): void
```

##### `isRateLimited()`

Check if currently rate limited.

```typescript
isRateLimited(): boolean
```

##### `getRateLimitResetTime()`

Get the rate limit reset time in milliseconds.

```typescript
getRateLimitResetTime(): number
```

##### `clearRateLimit()`

Clear the rate limit (useful for testing).

```typescript
clearRateLimit(): void
```

## Configuration Options

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

## Examples

### Basic Usage

```typescript
const client = new CachedHttpClient<string>(logger);

const tweet = await client.fetch("tweet-123", async () => {
  const response = await fetch(`https://api.twitter.com/2/tweets/123`);
  const data = await response.json();
  return data.text;
});
```

### Custom Retry Strategy

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

### Per-Request Configuration

```typescript
// Override throttling for urgent request
const data = await client.fetch("urgent-data", fetcher, {
  throttleMs: 0, // No throttling
  retries: 5, // More retries
  cacheTtl: 30000, // Cache for 30 seconds
});
```

### Rate Limit Configuration by API Tier

```typescript
// Twitter/X API Free Tier (1 req/15min)
const freeClient = new CachedHttpClient(logger, {
  throttleMs: 60000, // 60 seconds
});

// Twitter/X API Basic Tier (~15 req/15min)
const basicClient = new CachedHttpClient(logger, {
  throttleMs: 4000, // 4 seconds
});

// Twitter/X API Pro Tier (450-900 req/15min)
const proClient = new CachedHttpClient(logger, {
  throttleMs: 1000, // 1 second
});
```

### Error Handling

```typescript
try {
  const data = await client.fetch("key", fetcher);
  if (data === null) {
    console.log("Request failed or was rate limited");
  }
} catch (error: any) {
  console.error("Status:", error.status);
  console.error("Headers:", error.headers);
  console.error("Message:", error.message);
}
```

## Logger Interface

Implement the `ILogger` interface to provide custom logging:

```typescript
interface ILogger {
  info(message: string): void;
  warning(message: string): void;
  error(message: string): void;
}
```

**Example implementations:**

```typescript
// Console logger
const consoleLogger: ILogger = {
  info: console.log,
  warning: console.warn,
  error: console.error
};

// Pino logger
import pino from 'pino';
const logger = pino();
const pinoLogger: ILogger = {
  info: (msg) => logger.info(msg),
  warning: (msg) => logger.warn(msg),
  error: (msg) => logger.error(msg)
};

// Winston logger
import winston from 'winston';
const logger = winston.createLogger({...});
const winstonLogger: ILogger = {
  info: (msg) => logger.info(msg),
  warning: (msg) => logger.warn(msg),
  error: (msg) => logger.error(msg)
};
```

## Rate Limiting Behavior

The client automatically handles HTTP 429 responses:

1. Extracts `x-rate-limit-reset` header
2. Prevents further requests until reset time
3. Logs remaining time to reset
4. Returns `null` instead of throwing

## Default Behavior

- **Throttling**: 1 second between requests
- **Retries**: 2 attempts with exponential backoff (1s, 2s)
- **Cache TTL**: No expiration (0)
- **Retry Logic**:
  - Retries on 5xx server errors
  - Doesn't retry on auth errors (401, 403)
  - Doesn't retry on other 4xx client errors
  - Retries on network errors

## TypeScript Support

Full TypeScript support with generics:

```typescript
// Type-safe data fetching
interface User {
  id: string;
  name: string;
}

const client = new CachedHttpClient<User>(logger);

const user = await client.fetch("user-123", async () => {
  const response = await fetch("/api/users/123");
  return response.json(); // Typed as User
});

// user is typed as User | null
if (user) {
  console.log(user.name); // ✓ Type-safe
}
```

## Use Cases

- **API Rate Limiting**: Prevent hitting API rate limits on Twitter, GitHub, etc.
- **Slow APIs**: Cache responses to reduce latency
- **Unreliable Networks**: Automatic retries with exponential backoff
- **Cost Optimization**: Reduce API costs by caching responses
- **Development**: Reduce API calls during development/testing

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Credits

Built for Node.js/Bun applications following Hexagonal Architecture principles.

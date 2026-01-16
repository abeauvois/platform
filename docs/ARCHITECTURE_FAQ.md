# Architecture FAQ

Common questions about hexagonal architecture, dependency injection, and design patterns in this project.

## Table of Contents

- [Config Objects in Constructors](#config-objects-in-constructors)
- [Where to Use Config Objects](#where-to-use-config-objects)
- [Services vs Adapters](#services-vs-adapters)
- [Cross-Service Authentication Architecture](#cross-service-authentication-architecture)

---

## Config Objects in Constructors

### ❓ Is it good practice to add config parameters to adapter constructors?

**Short answer: No, it's generally NOT a good practice to pass config objects to adapter constructors.**

### Why Not?

#### 1. **Violates Interface Segregation Principle (ISP)**

- Adapters get access to the entire config even if they only need 1-2 values
- Creates unnecessary coupling

#### 2. **Hidden Dependencies**

- Not clear from the signature what config values the adapter actually needs
- You have to read the implementation to understand dependencies

#### 3. **Testing Complexity**

- Need to create full config objects in tests, even for unrelated values
- Harder to write focused unit tests

#### 4. **Tight Coupling**

- Adapter depends on config structure
- Changes to config class affect adapters that don't use those values

### The Better Approach: Explicit Dependencies

```typescript
// ❌ BAD: Config object
class GmailClient {
  constructor(private config: Config) {
    // Which config values are actually used? 🤷
  }
}

// ✅ GOOD: Explicit parameters
class GmailClient {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly refreshToken: string,
    private readonly logger: ILogger
  ) {
    // Clear dependencies! 👍
  }
}
```

### Benefits of Explicit Parameters

1. **Self-documenting** - constructor signature shows exact dependencies
2. **Easy to test** - just pass the values you need
3. **Respects Single Responsibility** - adapter only knows about what it needs
4. **Loose coupling** - no dependency on config structure

### When Config Might Be Acceptable

The only exception might be if you have a **configuration object specific to that adapter** (not a global config):

```typescript
interface GmailClientConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

class GmailClient {
  constructor(
    private readonly config: GmailClientConfig,
    private readonly logger: ILogger
  ) {}
}
```

But even then, individual parameters are usually clearer.

**Recommendation:** Keep injecting specific values. That's the right approach! 👍

---

## Where to Use Config Objects

Config objects have their place in the architecture. Here's where they fit best:

### ✅ 1. Composition Root (CLI/Main Entry Point)

**This is the BEST place for config!**

```typescript
// apps/cli/index.ts or apps/cli/commands/gmail.ts
async function gmailCommand() {
  // Load config at the composition root
  const config = new EnvConfig();
  await config.load();

  // Extract individual values
  const clientId = config.get("GMAIL_CLIENT_ID");
  const clientSecret = config.get("GMAIL_CLIENT_SECRET");
  const refreshToken = config.get("GMAIL_REFRESH_TOKEN");

  // Compose dependencies with explicit values
  const logger = new CliuiLogger();
  const gmailClient = new GmailClient(
    clientId,
    clientSecret,
    refreshToken,
    logger
  );
  const timestampRepo = new FileTimestampRepository(".gmail-last-run");

  // Create services with composed dependencies
  const workflowService = new GmailFetchWorkflowService(
    gmailClient,
    timestampRepo,
    logger,
    filterEmail
  );

  // Create use case
  const useCase = new FetchRecentGmailsUseCase(workflowService);
  await useCase.execute();
}
```

**Why here?**

- Single place to handle all configuration
- Validates config early (fail fast)
- No config leaks into domain/application layers
- Easy to swap implementations for testing

### ✅ 2. Factory Functions (Optional)

If you have complex initialization logic:

```typescript
// src/infrastructure/factories/createGmailWorkflow.ts
export function createGmailWorkflow(config: EnvConfig, logger: ILogger) {
  const clientId = config.get("GMAIL_CLIENT_ID");
  const clientSecret = config.get("GMAIL_CLIENT_SECRET");
  const refreshToken = config.get("GMAIL_REFRESH_TOKEN");
  const filterEmail = config.get("MY_EMAIL_ADDRESS");

  const gmailClient = new GmailClient(
    clientId,
    clientSecret,
    refreshToken,
    logger
  );
  const timestampRepo = new FileTimestampRepository(".gmail-last-run");

  return new GmailFetchWorkflowService(
    gmailClient,
    timestampRepo,
    logger,
    filterEmail
  );
}

// Usage in CLI
const workflowService = createGmailWorkflow(config, logger);
```

**Why factories?**

- Encapsulate complex wiring
- Reusable across multiple entry points
- Still keep config out of business logic

### ❌ Where NOT to Use Config

#### Domain Layer - NEVER

```typescript
// ❌ WRONG - Domain should know nothing about infrastructure
class EmailLink {
  constructor(private config: Config) {} // NO!
}
```

#### Application Layer (Services/Use Cases) - Generally NO

```typescript
// ❌ WRONG - Use cases should receive configured dependencies
class FetchRecentGmailsUseCase {
  constructor(private config: Config) {} // NO!

  async execute() {
    // Has to know about config structure
    const client = new GmailClient(this.config); // Tight coupling!
  }
}

// ✅ GOOD - Use case receives ready-to-use dependencies
class FetchRecentGmailsUseCase {
  constructor(private workflowService: GmailFetchWorkflowService) {}

  async execute() {
    return this.workflowService.fetchRecentMessages();
  }
}
```

#### Infrastructure Adapters - Generally NO

```typescript
// ❌ Avoid unless it's adapter-specific config
class GmailClient {
  constructor(private config: Config) {} // NO!
}
```

### Configuration Best Practices

**1. Load Once, Extract at Composition Root**

```typescript
// CLI entry point
const config = new EnvConfig();
await config.load();

// Validate early
if (!config.get("REQUIRED_VALUE")) {
  throw new Error("Missing required config");
}
```

**2. Pass Primitive Values Down**

```typescript
// Not this:
const service = new Service(config);

// But this:
const apiKey = config.get("API_KEY");
const service = new Service(apiKey);
```

**3. Group Related Config (Optional)**

```typescript
// If you have many related values, group them:
interface NotionConfig {
  apiKey: string;
  databaseId: string;
  retryAttempts: number;
}

const notionConfig: NotionConfig = {
  apiKey: config.get("NOTION_API_KEY"),
  databaseId: config.get("NOTION_DATABASE_ID"),
  retryAttempts: parseInt(config.get("NOTION_RETRY_ATTEMPTS") || "3"),
};

const notionRepo = new NotionLinkRepository(
  notionConfig.apiKey,
  notionConfig.databaseId
);
```

### Summary

**Use Config in:**

- ✅ CLI/Main entry points (composition root)
- ✅ Factory functions (for complex wiring)
- ✅ Test setup (to configure test doubles)

**Don't Use Config in:**

- ❌ Domain entities
- ❌ Application services/use cases
- ❌ Infrastructure adapters

**Golden Rule:** Config flows one direction only: **outside-in**. The outer layers (CLI) know about config. Inner layers (domain/application) know nothing about it.

---

## Services vs Adapters

### What's the Difference?

These terms can be confusing because they both live in similar areas. Here's the breakdown in the context of **Hexagonal Architecture**:

## 🔌 Adapter (Infrastructure Layer)

**Purpose:** Implements a domain port to connect to external systems

**Characteristics:**

- Lives in `src/infrastructure/adapters/`
- Implements a **domain port interface** (from `src/domain/ports/`)
- **Thin wrapper** around external dependencies
- Minimal business logic (just translation/adaptation)
- **One-to-one** relationship with external tool/API

### Examples

```typescript
// Adapter: Wraps Gmail API
class GmailClient implements IGmailClient {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private refreshToken: string,
    private logger: ILogger
  ) {}

  // Just translates between Gmail API and domain
  async fetchMessagesSince(since: Date): Promise<GmailMessage[]> {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const response = await gmail.users.messages.list({ ... });

    // Translate Gmail API response → GmailMessage domain entity
    return messages.map(msg => new GmailMessage(...));
  }
}
```

```typescript
// Adapter: Wraps Anthropic API
class UrlAndContextAnthropicAnalyser implements ILinkAnalyzer {
  constructor(
    private apiKey: string,
    private logger: ILogger
  ) {}

  // Translates between Anthropic API and domain
  async analyze(url: string, context: string): Promise<LinkAnalysis> {
    const response = await anthropic.messages.create({ ... });

    // Parse API response → domain model
    return {
      title: parsed.title,
      category: parsed.category,
      summary: parsed.summary
    };
  }
}
```

**Adapters are "dumb translators"** - they just convert between external world and your domain.

---

## ⚙️ Service (Application Layer)

**Purpose:** Orchestrates business workflows using multiple adapters/repositories

**Characteristics:**

- Lives in `src/application/services/`
- Contains **business logic & orchestration**
- Coordinates multiple adapters/ports
- **Stateless** (no instance state, just dependencies)
- Implements **application-level workflows**

### Examples

```typescript
// Service: Orchestrates email extraction workflow
class EmailExtractionWorkflowService {
  constructor(
    private zipExtractor: IZipExtractor, // Adapter
    private linksExtractor: ILinksExtractor, // Adapter
    private logger: ILogger // Adapter
  ) {}

  // Orchestrates: extract → parse → collect
  async extractAndParseEmails(sourcePath: string): Promise<EmailLink[]> {
    const producer = this.createProducer(sourcePath); // Business logic
    const pipeline = this.createPipeline(); // Business logic
    const consumer = new EmailLinkCollector(this.logger);

    const workflow = new WorkflowExecutor(producer, pipeline, consumer);

    await workflow.execute({
      onStart: async () => this.logger.info("📦 Extracting..."),
      onError: async (error, item) =>
        this.logger.warning(`⚠️ ${error.message}`),
      onComplete: async (stats) =>
        this.logger.info(`✅ Found ${stats.itemsProduced}`),
    });

    return consumer.getEmailLinks();
  }
}
```

```typescript
// Service: Orchestrates link analysis workflow
class LinkAnalysisService {
  constructor(
    private analyzer: ILinkAnalyzer, // Adapter
    private tweetScraper: ITweetScraper, // Adapter
    private logger: ILogger // Adapter
  ) {}

  // Business logic: enrich Twitter links, then analyze
  async analyzeLinks(links: EmailLink[]): Promise<EmailLink[]> {
    for (const link of links) {
      // Business decision: Is this a Twitter link?
      if (link.url.includes("twitter.com") || link.url.includes("x.com")) {
        // Orchestrate: scrape → enrich
        const tweetContent = await this.tweetScraper.scrapeTweet(link.url);
        link.content = tweetContent;
      }

      // Orchestrate: analyze with AI
      const analysis = await this.analyzer.analyze(link.url, link.context);
      link.category = analysis.category;
      link.summary = analysis.summary;
    }

    return links;
  }
}
```

**Services contain business logic and coordinate multiple adapters.**

---

## 📊 Visual Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                           │
│  (Composes services with adapters)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│               APPLICATION LAYER (Services)                  │
│                                                             │
│  EmailExtractionWorkflowService                             │
│  ├─ Orchestrates: extract → parse → collect                │
│  ├─ Uses: ZipExtractor, HttpLinksParser, Logger            │
│  └─ Business logic: choose producer, create pipeline       │
│                                                             │
│  LinkAnalysisService                                        │
│  ├─ Orchestrates: enrich → analyze                         │
│  ├─ Uses: TwitterScraper, AnthropicAnalyzer                │
│  └─ Business logic: detect Twitter, coordinate analysis    │
│                                                             │
│  GmailFetchWorkflowService                                  │
│  ├─ Orchestrates: fetch → collect                          │
│  ├─ Uses: GmailClient, TimestampRepository                 │
│  └─ Business logic: workflow setup, error handling         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│            INFRASTRUCTURE LAYER (Adapters)                  │
│                                                             │
│  GmailClient (implements IGmailClient)                      │
│  └─ Wraps: Google Gmail API                                │
│                                                             │
│  UrlAndContextAnthropicAnalyser (implements ILinkAnalyzer)  │
│  └─ Wraps: Anthropic Claude API                            │
│                                                             │
│  TwitterScraper (implements ITweetScraper)                  │
│  └─ Wraps: Twitter/X API                                   │
│                                                             │
│  ZipExtractor (implements IZipExtractor)                    │
│  └─ Wraps: File system operations                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Differences Summary

| Aspect             | Adapter                            | Service                          |
| ------------------ | ---------------------------------- | -------------------------------- |
| **Layer**          | Infrastructure                     | Application                      |
| **Purpose**        | Translate external → domain        | Orchestrate workflows            |
| **Business Logic** | Minimal (translation only)         | Yes (orchestration)              |
| **Dependencies**   | External systems                   | Domain ports/adapters            |
| **Implements**     | Domain port interface              | Nothing (just a class)           |
| **Complexity**     | Simple                             | Can be complex                   |
| **Example**        | `GmailClient`, `AnthropicAnalyzer` | `EmailExtractionWorkflowService` |

---

## 🤔 How to Decide: Service or Adapter?

**Ask yourself:**

1. **Does it wrap a single external system?** → **Adapter**

   - Gmail API → `GmailClient` adapter
   - Anthropic API → `AnthropicAnalyzer` adapter

2. **Does it coordinate multiple components?** → **Service**

   - Workflow orchestration → `EmailExtractionWorkflowService`
   - Multi-step process → `LinkAnalysisService`

3. **Does it contain business rules?** → **Service**

   - "If Twitter link, scrape first" → Service logic
   - "Retry on failure" → Service logic

4. **Is it just translation?** → **Adapter**
   - API response → domain entity
   - Domain entity → API request

---

## 💡 Real Example from This Codebase

```typescript
// ADAPTER: Just wraps HTTP/HTML parsing
class HttpLinksParser implements ILinksExtractor {
  async extractLinks(html: string): Promise<string[]> {
    const $ = cheerio.load(html);
    const links: string[] = [];

    $('a[href^="http"]').each((_, element) => {
      links.push($(element).attr("href")!);
    });

    return links; // Simple translation
  }
}

// SERVICE: Orchestrates extraction workflow
class EmailExtractionWorkflowService {
  constructor(
    private zipExtractor: IZipExtractor,
    private linksExtractor: ILinksExtractor, // ← Uses adapter
    private logger: ILogger
  ) {}

  async extractAndParseEmails(sourcePath: string): Promise<EmailLink[]> {
    // Business logic: determine source type
    const producer = stats.isDirectory()
      ? new SingleFolderProducer(sourcePath)
      : new ZipFileProducer(sourcePath, this.zipExtractor);

    // Business logic: create workflow
    const pipeline = new Pipeline(
      new EmailParserStage(this.linksExtractor) // ← Uses adapter
    );

    // Business logic: orchestrate execution
    const workflow = new WorkflowExecutor(producer, pipeline, consumer);
    await workflow.execute({
      /* error handling logic */
    });

    return consumer.getEmailLinks();
  }
}
```

The **adapter** (`HttpLinksParser`) is a simple wrapper. The **service** (`EmailExtractionWorkflowService`) coordinates everything!

---

## 📚 Summary

**Bottom line:**

- **Adapters** = "I talk to external systems"
- **Services** = "I orchestrate business processes"

This architecture ensures:

- ✅ Clear separation of concerns
- ✅ Testability (mock adapters, test services)
- ✅ Flexibility (swap adapters without changing services)
- ✅ Maintainability (each component has a single purpose)

---

## Cross-Service Authentication Architecture

### ❓ Why does trading-client authenticate directly with Platform API instead of going through Trading Server?

**Short answer: Platform serves as the canonical identity provider, and direct authentication provides the best latency with independent token validation.**

### Current Architecture

```
┌─────────────────┐      1. Sign In          ┌─────────────────┐
│  Trading Client │ ────────────────────────►│   Platform API  │
│                 │◄────────────────────────│                 │
│                 │   Bearer Token           │                 │
│                 │   (set-auth-token)       │                 │
└────────┬────────┘                          └────────┬────────┘
         │                                            │
         │ 2. Trading Ops                             │
         │ (Authorization: Bearer <token>)            │ Shared:
         ▼                                            │ - DATABASE_URL
┌─────────────────┐                                   │ - BETTER_AUTH_SECRET
│ Trading Server  │◄──────────────────────────────────┘
│                 │   (validates token independently)
└─────────────────┘
```

**Flow:**
1. Trading-client authenticates directly with Platform API
2. Platform returns bearer token in `set-auth-token` response header
3. Client stores token in localStorage
4. Client sends token as `Authorization: Bearer` header to Trading Server
5. Trading Server validates token using shared database + auth secret

### Why Direct Authentication (Not Proxied)?

| Benefit | Explanation |
|---------|-------------|
| **Lower Latency** | Auth requests go directly to Platform API without an extra hop through Trading Server |
| **Independent Validation** | Trading Server validates tokens using shared `BETTER_AUTH_SECRET` + `DATABASE_URL` - no runtime dependency on Platform API |
| **Failure Isolation** | If Platform API is down, Trading Server can still validate cached sessions and serve read operations |
| **Canonical Identity Provider** | Platform is the single source of truth for auth, payments, settings - clients should connect directly |
| **Standard Pattern** | Mirrors OAuth 2.0 where clients get tokens from auth server and use them with resource servers |

### Alternative: Proxied Authentication

```
┌─────────────────┐     All Requests    ┌─────────────────┐     Auth      ┌─────────────────┐
│  Trading Client │ ──────────────────► │ Trading Server  │ ────────────► │   Platform API  │
│                 │◄────────────────── │                 │◄────────────── │                 │
└─────────────────┘                     └─────────────────┘               └─────────────────┘
```

**When this pattern makes sense:**

- **Single-domain deployment** - Client only knows one URL
- **BFF (Backend-for-Frontend)** - Trading Server aggregates/transforms Platform responses
- **Token opacity** - Don't want clients to see/store auth tokens
- **API Gateway** - Adding rate limiting, caching at Trading Server level

### Trade-off Comparison

| Aspect | Direct (Current) | Proxied |
|--------|------------------|---------|
| **Latency** | Lower for auth | Higher (extra hop) |
| **Client Complexity** | Knows 2 service URLs | Knows 1 URL |
| **Coupling** | Client → Platform + Trading | Client → Trading only |
| **Failure Isolation** | Better (services independent) | Worse (Trading depends on Platform) |
| **Scalability** | Auth traffic distributed | Trading Server bottleneck |
| **Token Management** | Client manages token | Server manages token |

### How Token Validation Works

Both Platform API and Trading Server can validate tokens because they share:

1. **`BETTER_AUTH_SECRET`** - Same signing secret for token validation
2. **`DATABASE_URL`** - Same database for session lookup

```typescript
// apps/trading-server/lib/auth.ts
const auth = createAuth({
  db,
  schema,
  provider: 'pg',
  trustedOrigins: [TRADING_CLIENT_URL, DASHBOARD_URL],
});

// The bearer() plugin enables Authorization header validation
// better-auth validates token against shared database
```

### Implementation Details

**Client captures token on sign-in:**
```typescript
// apps/trading-client/src/lib/auth-client.ts
export const authClient = createAuthClient({
  baseURL: config.authApiUrl,
  fetchOptions: {
    credentials: 'include',
    onSuccess: (ctx) => {
      const token = ctx.response.headers.get('set-auth-token');
      if (token) saveAuthToken(token);
    },
  },
});
```

**SDK sends bearer token:**
```typescript
// apps/trading-client/src/lib/trading-client.ts
export const tradingClient = new TradingApiClient({
  baseUrl: config.tradingApiUrl,
  getToken: getAuthToken, // Returns token from localStorage
});
```

**Trading Server validates via middleware:**
```typescript
// apps/trading-server/middlewares/auth.middleware.ts
const session = await auth.api.getSession({
  headers: c.req.raw.headers, // Reads Authorization: Bearer header
});
if (!session) return c.json({ error: 'Unauthorized' }, 401);
```

### Summary

The direct authentication pattern is recommended when:
- ✅ Platform is your canonical identity provider
- ✅ You want lower auth latency
- ✅ Services should be independently resilient
- ✅ Following standard OAuth-like patterns

Consider proxied authentication when:
- 🔄 Client should only know one service URL
- 🔄 You need server-side token management
- 🔄 Adding API gateway functionality

---

_Last updated: 2026-01-16_

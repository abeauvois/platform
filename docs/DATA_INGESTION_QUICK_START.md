# Data Ingestion Abstraction - Quick Start

## 🎯 What is it?

A flexible, OOP-based system for ingesting data from multiple sources (Gmail, zip files, Twitter, etc.) using a unified interface.

## 🚀 Quick Example

### Gmail Data Source

```typescript
import { GmailDataSource } from "./infrastructure/adapters/GmailDataSource.js";
import { ApiIngestionConfig } from "./domain/entities/IngestionConfig.js";

// 1. Create data source
const dataSource = new GmailDataSource(
  gmailClient,
  timestampRepository,
  logger
);

// 2. Configure ingestion
const config: ApiIngestionConfig = {
  credentials: {
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
  },
  since: new Date("2025-01-01"),
  filters: {
    email: "sender@example.com",
  },
};

// 3. Ingest data
const content = await dataSource.ingest(config);
// Returns: BaseContent[]
```

### Zip File Data Source

```typescript
import { ZipFileDataSource } from "./infrastructure/adapters/ZipFileDataSource.js";
import { FileIngestionConfig } from "./domain/entities/IngestionConfig.js";

// 1. Create data source
const dataSource = new ZipFileDataSource(zipExtractor, logger);

// 2. Configure ingestion
const config: FileIngestionConfig = {
  path: "/path/to/emails.zip",
};

// 3. Ingest data
const content = await dataSource.ingest(config);
// Returns: BaseContent[]
```

## 📁 File Structure

```
src/
├── domain/
│   └── entities/
│       ├── IngestionConfig.ts          # Configuration interfaces
│       ├── AbstractDataSource.ts       # Base class
│       ├── StructuredDataSource.ts     # For API sources
│       └── UnstructuredDataSource.ts   # For file sources
│
└── infrastructure/
    ├── adapters/
    │   ├── GmailDataSource.ts         # Gmail implementation
    │   └── ZipFileDataSource.ts       # Zip file implementation
    │
    └── tests/unit/
        ├── test-gmail-data-source.test.ts      # Gmail tests (8 tests ✅)
        └── test-zipfile-data-source.test.ts    # Zip tests (9 tests ✅)

docs/
└── DATA_INGESTION_ABSTRACTION.md      # Full documentation
```

## 🎨 Class Hierarchy

```
AbstractDataSource<TRaw, TNormalized>
│
├── StructuredDataSource (for APIs)
│   └── GmailDataSource ✅
│       └── Future: TwitterDataSource, NotionDataSource
│
└── UnstructuredDataSource (for files)
    └── ZipFileDataSource ✅
        └── Future: DirectoryDataSource, PDFDataSource
```

## 🧪 Testing

All implementations have comprehensive test coverage:

```bash
# Test Gmail data source
bun test src/infrastructure/tests/unit/test-gmail-data-source.test.ts
# ✓ 8 pass, 0 fail

# Test Zip file data source
bun test src/infrastructure/tests/unit/test-zipfile-data-source.test.ts
# ✓ 9 pass, 0 fail
```

## 🔑 Key Features

- ✅ **Unified Interface**: All sources implement same contract
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **Extensible**: Easy to add new sources
- ✅ **Well-Tested**: 17 passing tests total
- ✅ **Documented**: Comprehensive documentation
- ✅ **OOP Design**: Inheritance, Polymorphism, Encapsulation

## 🎓 Design Patterns

1. **Template Method**: `AbstractDataSource.ingest()` defines workflow
2. **Strategy**: Each source implements its own fetch/normalize strategy
3. **Factory**: (Future) Create sources dynamically

## 📚 Learn More

- Full documentation: [DATA_INGESTION_ABSTRACTION.md](./DATA_INGESTION_ABSTRACTION.md)
- Architecture guide: [ARCHITECTURE_FAQ.md](./ARCHITECTURE_FAQ.md)
- Testing guide: [../TESTING_GUIDE.md](../TESTING_GUIDE.md)

## 🔮 Next Steps

1. Add more data sources (Twitter, Notion, RSS)
2. Create `GenericDataSourceProducer` adapter
3. Build `DataSourceFactory` for dynamic creation
4. Add integration tests with real APIs
5. Implement advanced features (pagination, rate limiting, caching)

## 💡 Adding a New Data Source

### Example: Twitter Data Source

```typescript
import { StructuredDataSource } from "../../domain/entities/StructuredDataSource.js";
import { Tweet } from "../entities/Tweet.js";

export class TwitterDataSource extends StructuredDataSource<
  Tweet,
  BaseContent
> {
  constructor(private rateLimitedClient: IRateLimitedClient, logger: ILogger) {
    super(SourceAdapter.Twitter, logger);
  }

  protected async validateApiConfig(config: ApiIngestionConfig): Promise<void> {
    if (!config.credentials.bearerToken) {
      throw new Error("Twitter requires bearerToken");
    }
  }

  protected async fetchRaw(config: IngestionConfig): Promise<Tweet[]> {
    const apiConfig = config as ApiIngestionConfig;
    return await this.rateLimitedClient.fetchTweets(
      apiConfig.since,
      apiConfig.filters
    );
  }

  protected async normalize(tweets: Tweet[]): Promise<BaseContent[]> {
    return tweets.map(
      (tweet) =>
        new BaseContent(
          tweet.url,
          SourceAdapter.Twitter,
          [],
          "",
          tweet.text,
          tweet.createdAt,
          tweet.createdAt
        )
    );
  }
}
```

### Write Tests First (TDD)

```typescript
describe("TwitterDataSource", () => {
  test("should fetch and normalize tweets", async () => {
    const mockClient = new MockRateLimitedClient();
    const dataSource = new TwitterDataSource(mockClient, logger);

    const config: ApiIngestionConfig = {
      credentials: { bearerToken: "xxx" },
      since: new Date("2025-01-01"),
    };

    const results = await dataSource.ingest(config);

    expect(results).toHaveLength(expectedCount);
    expect(results[0].sourceAdapter).toBe(SourceAdapter.Twitter);
  });
});
```

## 🤝 Contributing

When adding new data sources:

1. **Write tests first** (TDD approach)
2. **Extend appropriate base class** (Structured or Unstructured)
3. **Implement abstract methods** (validateConfig, fetchRaw, normalize)
4. **Optional: Override enrich()** for additional processing
5. **Document your implementation**
6. **Run all tests** to ensure nothing breaks

---

Built with ❤️ following hexagonal architecture principles and TDD methodology.

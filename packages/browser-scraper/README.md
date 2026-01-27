# @abeauvois/platform-browser-scraper

Browser scraping adapter using Chrome DevTools Protocol with Playwright.

## Features

- Connect to Chrome via CDP (Chrome DevTools Protocol)
- Strategy pattern for flexible scraping implementations
- Type-safe with full TypeScript support
- Built for Bun runtime
- Includes Leboncoin scraping strategy out of the box

## Installation

```bash
bun add @abeauvois/platform-browser-scraper
```

## Usage

### Basic Usage with ChromeCdpAdapter

```typescript
import { ChromeCdpAdapter, LeboncoinStrategy } from '@abeauvois/platform-browser-scraper';

// Connect to Chrome instance
const scraper = new ChromeCdpAdapter({
  cdpEndpoint: 'ws://localhost:9222/devtools/browser/abc123',
  defaultTimeout: 30000, // optional, defaults to 30000ms
});

await scraper.connect();

// Scrape a Leboncoin search page
const strategy = new LeboncoinStrategy();
const listings = await scraper.scrape('https://www.leboncoin.fr/recherche?category=10', strategy);

console.log(listings);
// [
//   {
//     title: "Apartment in Paris",
//     price: "1200 €",
//     location: "Paris 75001",
//     url: "https://www.leboncoin.fr/...",
//     imageUrl: "https://...",
//     postedAt: "Aujourd'hui, 14:30"
//   },
//   ...
// ]

await scraper.disconnect();
```

### Creating Custom Scraping Strategies

```typescript
import type { IScrapeStrategy, Page } from '@abeauvois/platform-browser-scraper';

interface MyCustomData {
  title: string;
  description: string;
}

class MyCustomStrategy implements IScrapeStrategy<MyCustomData> {
  public readonly name = 'my-custom-scraper';

  async execute(page: Page): Promise<MyCustomData> {
    await page.waitForSelector('.product-title');

    const title = await page.locator('.product-title').textContent() ?? '';
    const description = await page.locator('.product-description').textContent() ?? '';

    return {
      title: title.trim(),
      description: description.trim(),
    };
  }
}

// Use your custom strategy
const customStrategy = new MyCustomStrategy();
const data = await scraper.scrape('https://example.com/product', customStrategy);
```

## API

### `ChromeCdpAdapter`

#### Constructor Options

```typescript
interface BrowserScraperOptions {
  cdpEndpoint: string;      // WebSocket endpoint for Chrome DevTools Protocol
  defaultTimeout?: number;  // Default timeout in milliseconds (default: 30000)
}
```

#### Methods

- `connect(): Promise<void>` - Connect to Chrome via CDP
- `disconnect(): Promise<void>` - Disconnect and close the browser connection
- `isConnected(): boolean` - Check if currently connected to browser
- `scrape<T>(url: string, strategy: IScrapeStrategy<T>): Promise<T>` - Scrape a URL using the provided strategy

### `IScrapeStrategy<T>`

Interface for implementing custom scraping strategies.

```typescript
interface IScrapeStrategy<T> {
  name: string;
  execute(page: Page): Promise<T>;
}
```

### Built-in Strategies

#### `LeboncoinStrategy`

Scrapes Leboncoin search result pages and extracts listings.

Returns: `Array<ScrapedListing>`

```typescript
interface ScrapedListing {
  title: string;
  price: string;
  location: string;
  url: string;
  imageUrl?: string;
  postedAt?: string;
}
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build
bun run build

# Watch mode
bun run dev
```

## Architecture

This package follows hexagonal architecture principles:

- **Port**: `IScrapeStrategy<T>` defines the contract for scraping strategies
- **Adapter**: `ChromeCdpAdapter` implements browser connection via CDP
- **Strategies**: Concrete implementations like `LeboncoinStrategy` for specific websites

## License

MIT

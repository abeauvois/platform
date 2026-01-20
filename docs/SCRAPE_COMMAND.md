# Browser Scraper CLI

The `scrape` command allows you to extract listings from protected websites using Chrome DevTools Protocol (CDP). This is useful for scraping sites that require JavaScript rendering or have anti-bot protections.

## Supported Sources

| Source | Website | Description |
|--------|---------|-------------|
| `leboncoin` | leboncoin.fr | French classifieds marketplace |
| `autoscout24` | autoscout24.fr | European car marketplace |

## Prerequisites

### 1. Start Chrome with Remote Debugging

Before using the scraper, you need to start Chrome with remote debugging enabled:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-scraper" &

# Linux
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-scraper" &

# Windows (PowerShell)
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:USERPROFILE\.chrome-scraper"
```

**Flags explanation:**
- `--remote-debugging-port=9222`: Enables CDP on port 9222
- `--user-data-dir`: Uses a separate profile to avoid conflicts with your main browser session

### 2. Verify Chrome is Running

You can verify Chrome is ready by visiting: http://localhost:9222/json/version

## Usage

### Basic Syntax

```bash
bun run apps/cli/index.ts scrape <source> --url "<url>" [options]
```

### Options

| Flag | Alias | Description | Default |
|------|-------|-------------|---------|
| `--url` | `-u` | URL to scrape (required) | - |
| `--pages` | `-p` | Number of pages to scrape | 1 |
| `--delay` | `-d` | Delay in ms between pages | 500 |
| `--cdp-endpoint` | - | Chrome CDP endpoint | `http://localhost:9222` |
| `--json` | - | Output as JSON | false |
| `--save` | - | Save results to database | false |

## Examples

### Leboncoin

```bash
# Scrape job listings in Ile-de-France
bun run apps/cli/index.ts scrape leboncoin \
  --url "https://www.leboncoin.fr/recherche?category=71&locations=r_12" \
  --pages 3

# Scrape real estate listings with JSON output
bun run apps/cli/index.ts scrape leboncoin \
  -u "https://www.leboncoin.fr/recherche?category=9&locations=Paris" \
  --json

# Scrape and save to database
bun run apps/cli/index.ts scrape leboncoin \
  -u "https://www.leboncoin.fr/recherche?category=2" \
  --save
```

### AutoScout24

```bash
# Scrape Ferrari Roma listings in France
bun run apps/cli/index.ts scrape autoscout24 \
  --url "https://www.autoscout24.fr/lst/ferrari/roma?cy=F" \
  --pages 2

# Scrape Porsche 911 with JSON output
bun run apps/cli/index.ts scrape autoscout24 \
  -u "https://www.autoscout24.fr/lst/porsche/911?cy=F" \
  --json

# Scrape with custom delay between pages
bun run apps/cli/index.ts scrape autoscout24 \
  -u "https://www.autoscout24.fr/lst/bmw/m3?cy=F" \
  --pages 5 \
  --delay 1000
```

## Output Format

### Console Output (default)

```
╭──────────────────────────────────────────────────────────╮
│                                                          │
│  Results (showing 10 of 25)                              │
│                                                          │
│  1. Ferrari Roma 3.9 V8 Biturbo 620 DCT                  │
│     💰 289 900 € | 📍 FR-75008 Paris                     │
│     🔗 https://www.autoscout24.fr/voiture/...            │
│                                                          │
│  2. Ferrari Roma 2020                                    │
│     💰 275 000 € | 📍 FR-69001 Lyon                      │
│     🔗 https://www.autoscout24.fr/voiture/...            │
│                                                          │
╰──────────────────────────────────────────────────────────╯
```

### JSON Output (`--json`)

```json
{
  "success": true,
  "data": [
    {
      "title": "Ferrari Roma 3.9 V8 Biturbo 620 DCT",
      "price": "289 900 €",
      "location": "FR-75008 Paris",
      "description": "<article>...</article>",
      "externalCategory": "Ferrari Roma",
      "url": "https://www.autoscout24.fr/voiture/...",
      "imageUrl": "https://prod.pictures.autoscout24.net/...",
      "postedAt": "01/2021 | 22 500 km | 456 kW (620 ch) | Essence"
    }
  ],
  "count": 25
}
```

## Scraped Data Fields

| Field | Description |
|-------|-------------|
| `title` | Listing title |
| `price` | Price (with currency) |
| `location` | City/postal code |
| `description` | Raw HTML of the listing card (cleaned) |
| `externalCategory` | Category extracted from page (e.g., "Ferrari Roma", "Emploi") |
| `url` | Full URL to the listing |
| `imageUrl` | Primary image URL (optional) |
| `postedAt` | Additional info like date, mileage, specs (optional) |

## Troubleshooting

### "Cannot connect to Chrome"

Make sure Chrome is running with remote debugging:
```bash
curl http://localhost:9222/json/version
```

If it fails, restart Chrome with the debugging flags.

### "No listings found"

1. Navigate to the URL manually in the Chrome instance to verify it loads
2. Check if the site requires login or has CAPTCHA
3. Increase the delay between pages with `--delay 2000`

### Cookie Consent Popups

The scraper automatically handles cookie consent popups for supported sites. If you still see issues:
1. Manually accept cookies in the Chrome instance once
2. The session will remember your choice

### Rate Limiting

If you're getting blocked:
1. Increase delay between pages: `--delay 2000`
2. Reduce number of pages per session
3. Use the same Chrome profile (`--user-data-dir`) to maintain session cookies

## Architecture

The scraper uses:
- **Puppeteer-core**: Connects to existing Chrome instance via CDP
- **Strategy Pattern**: Each source has its own scraping strategy
- **Hexagonal Architecture**: Strategies implement `IScrapeStrategy` interface

```
ChromeCdpAdapter
     │
     ├── LeboncoinStrategy
     │      ├── dismissCookieConsent()
     │      ├── extractCategoryFromPage()
     │      └── extractListingsFromPage()
     │
     └── AutoScout24Strategy
            ├── dismissCookieConsent()
            ├── extractCategoryFromPage()
            └── extractListingsFromPage()
```

## Adding New Sources

To add support for a new website:

1. Create a new strategy in `packages/browser-scraper/src/scraping-strategies/`
2. Implement `IScrapeStrategy<Array<ScrapedListing>>`
3. Export from `packages/browser-scraper/src/index.ts`
4. Add source handling in:
   - `apps/cli/commands/scrape/index.ts`
   - `apps/api/server/routes/scraper.routes.ts`

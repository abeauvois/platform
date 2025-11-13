# Twitter Integration Tests

This directory contains integration tests for the Twitter scraping functionality.

## Tests

### test-resolveShortUrl.ts

Integration test for the `resolveShortUrl` function from `TwitterScraper.ts`.

**What it tests:**

- Resolving shortened X.com URLs with tracking parameters (s=51&t=...)
- Verifying resolved URLs match expected patterns
- Confirming resolved URLs are valid Twitter/X URLs
- Error handling for invalid/unreachable URLs

**How to run:**

```bash
bun run src/infrastructure/tests/integration/twitter/test-resolveShortUrl.ts
```

**Requirements:**

- Internet connection (makes real HTTP HEAD requests)
- No authentication required (public URL resolution)

**Test Cases:**

1. **Shortened X.com URL 1**: Tests resolution of `https://x.com/neatprompts/status/1980129370653257739?s=51&t=JsTxSwMxTXa`
2. **Shortened X.com URL 2**: Tests resolution of `https://x.com/daievolutionhub/status/1975169191209554269?s=51&t=JsTxSwM`
3. **Error Handling**: Tests graceful handling of invalid/unreachable URLs

**Note:** This test uses real HTTP requests without mocks to verify the actual URL resolution behavior.

## Implementation Details

The `resolveShortUrl` function:

- Uses HTTP HEAD requests to follow redirects without downloading content
- Returns the final URL after following all redirects
- Only returns URLs that are Twitter/X links
- Returns `null` for non-Twitter URLs or on errors
- Handles network errors gracefully

### How URL Resolution Works

1. Sends an HTTP HEAD request with `redirect: 'follow'`
2. The browser/fetch automatically follows redirects
3. Extracts the final URL from `response.url`
4. Validates that the final URL is a Twitter/X URL
5. Returns the resolved URL or `null`

### Typical Use Cases

- Resolving Twitter's t.co shortened links
- Handling X.com URLs with tracking parameters (s=, t=)
- Converting mobile share links to canonical URLs
- Following URL redirects to final destinations

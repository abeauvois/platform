# Notion Integration Tests

This directory contains integration tests for the Notion database functionality.

## Tests

### test-findPageByUrl.ts

Integration test for the `findPageByUrl` function from `NotionDatabaseWriter.ts`.

**What it tests:**

- Searching for non-existent pages (should return null)
- Creating a page and finding it by URL
- Consistency of search results across multiple calls
- Integration with the `updatePages` method

**How to run:**

```bash
bun run src/infrastructure/tests/integration/notion/test-findPageByUrl.ts
```

**Requirements:**

- Valid Notion integration token in `.env` file (`NOTION_INTEGRATION_TOKEN`)
- Valid Notion database ID in `.env` file (`NOTION_DATABASE_ID`)
- The database must be shared with your integration
- The database must have the following properties:
  - `Link` (title property)
  - `Tag` (multi-select property)
  - `Description` (rich text property)

**Note:** This test creates actual pages in your Notion database. You may want to manually clean up test pages after running the test.

### test-notion.ts

Basic integration test that creates sample pages in the Notion database.

**How to run:**

```bash
bun run src/infrastructure/tests/integration/notion/test-notion.ts
```

## Implementation Details

The tests use the updated Notion API (version 2025-09-03) which follows the structure:

- **Database** → Contains one or more data sources
- **Data Source** → Contains pages
- **Pages** → Individual entries with properties

The `findPageByUrl` function now correctly:

1. Retrieves the database and its data sources
2. Queries each data source for pages matching the URL
3. Returns the page ID if found, or null otherwise

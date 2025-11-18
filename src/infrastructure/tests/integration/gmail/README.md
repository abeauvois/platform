# Gmail Integration Tests

Integration tests for Gmail API connectivity and credential validation.

## Overview

These tests verify:

- Gmail API authentication with real credentials
- Proper error handling for invalid credentials
- Message fetching functionality
- Message structure validation

## Running the Tests

```bash
# Run Gmail integration tests
bun test ./src/infrastructure/tests/integration/gmail/test-gmail-credentials.ts
```

## Prerequisites

### For Full Testing (with real API calls)

1. **Gmail API credentials** in `.env` file:

   ```bash
   GMAIL_CLIENT_ID=your_actual_client_id
   GMAIL_CLIENT_SECRET=your_actual_client_secret
   GMAIL_REFRESH_TOKEN=your_actual_refresh_token
   ```

2. **Valid OAuth 2.0 credentials** from Google Cloud Console
   - See [docs/GMAIL_COMMAND.md](../../../../docs/GMAIL_COMMAND.md) for setup instructions

### For Basic Testing (error handling only)

No credentials needed - tests will skip API calls and only verify error handling.

## Test Behavior

### With Valid Credentials

```bash
$ bun test ./src/infrastructure/tests/integration/gmail/test-gmail-credentials.ts

✅ Gmail credentials found, testing API connection...
✅ Successfully fetched 12 message(s) from last 7 days
✅ Message structure validated
   Sample: "Project Update" from colleague@company.com
✅ Invalid credentials properly rejected

✓ Gmail API Integration > should authenticate and fetch messages with valid credentials
✓ Gmail API Integration > should handle authentication errors gracefully

2 pass
```

### With Placeholder/Missing Credentials

```bash
$ bun test ./src/infrastructure/tests/integration/gmail/test-gmail-credentials.ts

⏭️  Skipping Gmail integration test: Placeholder credentials detected
   Replace placeholder values with real Gmail credentials

✓ Gmail API Integration > should authenticate and fetch messages with valid credentials [SKIPPED]
✅ Invalid credentials properly rejected
✓ Gmail API Integration > should handle authentication errors gracefully

2 pass
```

## Test Cases

### 1. Authentication & Fetch (`should authenticate and fetch messages with valid credentials`)

**What it tests:**

- Loads credentials from `.env` file
- Authenticates with Gmail API using OAuth 2.0
- Fetches messages from the last 7 days
- Validates message structure (id, subject, from, receivedAt, snippet)

**Skipped when:**

- Credentials not found in `.env`
- Placeholder credentials detected
- Any required credential is missing

**Possible errors:**

- `invalid_grant`: Refresh token expired/revoked
- `invalid_client`: Invalid client ID or secret
- API quota exceeded
- Network errors

### 2. Error Handling (`should handle authentication errors gracefully`)

**What it tests:**

- Creates client with intentionally invalid credentials
- Verifies that API call fails (doesn't hang or crash)
- Ensures error is properly thrown

**Always runs:** Does not require real credentials

## Troubleshooting

### Test is skipped

**Cause**: No valid credentials found

**Solution**:

1. Ensure `.env` file exists in project root
2. Add Gmail credentials (see setup instructions)
3. Replace placeholder values with real credentials

### `invalid_grant` error

**Cause**: Refresh token expired or revoked

**Solution**:

1. Generate new refresh token using [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Update `GMAIL_REFRESH_TOKEN` in `.env`
3. Ensure OAuth consent screen is configured correctly
4. Add yourself as a test user if app is in "Testing" mode

### `invalid_client` error

**Cause**: Invalid client credentials

**Solution**:

1. Verify credentials in Google Cloud Console
2. Ensure credentials are from correct project
3. Check that client ID and secret match
4. Verify OAuth client type is "Desktop app"

### Network timeout

**Cause**: Slow network or API issues

**Solution**:

- Tests have 30-second timeout
- Check internet connection
- Verify Gmail API is not experiencing outages

### `quota exceeded` error

**Cause**: Exceeded Gmail API quotas

**Solution**:

- Wait for quota to reset (usually 24 hours)
- Check quota usage in Google Cloud Console
- Request quota increase if needed

## What Gets Tested

### Message Structure

Each fetched message is validated to have:

```typescript
{
  id: string,              // Gmail message ID
  subject: string,         // Email subject line
  from: string,           // Sender email address
  receivedAt: Date,       // When email was received
  snippet: string         // Message preview text
}
```

### Error Scenarios

- Invalid credentials rejection
- Authentication failures
- API errors

## Integration with CI/CD

These tests can be integrated into CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run Gmail Integration Tests
  env:
    GMAIL_CLIENT_ID: ${{ secrets.GMAIL_CLIENT_ID }}
    GMAIL_CLIENT_SECRET: ${{ secrets.GMAIL_CLIENT_SECRET }}
    GMAIL_REFRESH_TOKEN: ${{ secrets.GMAIL_REFRESH_TOKEN }}
  run: bun test ./src/infrastructure/tests/integration/gmail/
```

**Note**: Tests gracefully skip when credentials are not available, so they won't fail CI/CD pipelines that don't have Gmail credentials configured.

## Related Documentation

- **[GMAIL_COMMAND.md](../../../../docs/GMAIL_COMMAND.md)** - Gmail command usage and setup
- **[TESTING_GUIDE.md](../../../../TESTING_GUIDE.md)** - General testing guidelines
- **[TDD.md](../../../../TDD.md)** - TDD approach used in this project

## Security Notes

⚠️ **Never commit real credentials to version control**

- Use `.env` file (already in `.gitignore`)
- Use environment variables in CI/CD
- Rotate credentials if accidentally exposed
- Use test accounts for automated testing

## Running All Integration Tests

To run all integration tests (Gmail, Notion, Twitter, etc.):

```bash
bun run it
```

This will run the integration test suite defined in `package.json`.

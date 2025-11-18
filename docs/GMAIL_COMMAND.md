# Gmail Command Documentation

## Overview

The `gmail` command fetches recent Gmail messages received since the last time the command was executed. It uses incremental fetching to show only new emails, making it perfect for periodic email monitoring.

## Usage

```bash
bun run cli gmail
```

## Features

- **Incremental Fetching**: Only shows emails received since last execution
- **Sender Filtering**: Optional filter to show emails from specific sender only
- **Persistent Tracking**: Stores last execution timestamp in `.gmail-last-run` file
- **Rich Display**: Shows sender, subject, received date, and message preview
- **OAuth Authentication**: Secure authentication via Google OAuth 2.0

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Enable the Gmail API:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Configure OAuth consent screen (if not already done):
   - User Type: External
   - Add your email as a test user
4. Application type: Desktop app
5. Give it a name (e.g., "Email Link Extractor")
6. Download the credentials JSON

### 3. Generate Refresh Token

Use the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) or create a simple script:

```typescript
// generate-token.ts
import { google } from "googleapis";
import readline from "readline";

const oauth2Client = new google.auth.OAuth2(
  "YOUR_CLIENT_ID",
  "YOUR_CLIENT_SECRET",
  "urn:ietf:wg:oauth:2.0:oob"
);

const scopes = ["https://www.googleapis.com/auth/gmail.readonly"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: scopes,
});

console.log("Authorize this app by visiting this url:", authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter the code from that page here: ", async (code) => {
  rl.close();
  const { tokens } = await oauth2Client.getToken(code);
  console.log("Refresh token:", tokens.refresh_token);
});
```

Run it:

```bash
bun run generate-token.ts
```

### 4. Configure .env File

Add the credentials to your `.env` file:

```bash
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REFRESH_TOKEN=your_refresh_token_here

# Optional: Filter emails by sender
MY_EMAIL_ADDRESS=your_email@gmail.com
```

**Optional Configuration:**

- `MY_EMAIL_ADDRESS`: When set, only emails from this sender will be fetched
  - Useful for filtering emails you sent to yourself
  - Uses Gmail's `from:` search operator
  - If not set, all emails will be fetched

## How It Works

### Architecture

Following **Hexagonal Architecture (Ports & Adapters)**:

```
┌─────────────────────────────────────┐
│  CLI Command (gmail.ts)             │
│  - User interface                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Application Layer                   │
│  - FetchRecentGmailsUseCase         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Domain Layer                        │
│  - GmailMessage entity               │
│  - IGmailClient port                 │
│  - ITimestampRepository port         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Infrastructure Layer                │
│  - GoogleGmailClient adapter         │
│  - FileTimestampRepository           │
└─────────────────────────────────────┘
```

### Workflow

1. **Check for last execution**: Reads `.gmail-last-run` file
2. **Fetch new messages**: Queries Gmail API for emails since last execution
   - First run: Fetches from beginning of time (epoch)
   - Subsequent runs: Fetches only new messages
3. **Display results**: Shows formatted message list with preview
4. **Save timestamp**: Stores current time for next execution

### Data Flow

```typescript
// 1. Use case executes
const useCase = new FetchRecentGmailsUseCase(gmailClient, timestampRepo);
const messages = await useCase.execute();

// 2. Retrieves last execution time
const lastRun = await timestampRepo.getLastExecutionTime();
// Returns: Date | null

// 3. Fetches messages from Gmail
const messages = await gmailClient.fetchMessagesSince(lastRun || new Date(0));

// 4. Saves current timestamp
await timestampRepo.saveLastExecutionTime(new Date());

// 5. Returns messages to CLI
```

## Example Output

### First Run (No Previous Timestamp)

```bash
$ bun run cli gmail

📧 Gmail Recent Messages

◇  Fetching recent Gmail messages...
│  Found 5 new messages
│
└  Done ✅

📬 Recent Messages:

1. 📩 Weekly Newsletter - Tech Updates
   From: newsletter@example.com
   Received: 11/17/2024, 7:00:00 PM
   Preview: This week in tech: AI breakthroughs, new frameworks, and more...

2. 📩 Meeting Invitation
   From: colleague@company.com
   Received: 11/17/2024, 6:30:00 PM
   Preview: Would like to schedule a meeting to discuss the project roadmap...

...

✨ Gmail check complete!
```

### Subsequent Run (Incremental)

```bash
$ bun run cli gmail

📧 Gmail Recent Messages

◇  Fetching recent Gmail messages...
│  Found 2 new messages
│
└  Done ✅

📬 Recent Messages:

1. 📩 Re: Project Update
   From: manager@company.com
   Received: 11/17/2024, 7:30:00 PM
   Preview: Thanks for the update. Let's discuss in tomorrow's standup...

2. 📩 Security Alert
   From: security@service.com
   Received: 11/17/2024, 7:25:00 PM
   Preview: New sign-in detected from unknown device...

✨ Gmail check complete!
```

### No New Messages

```bash
$ bun run cli gmail

📧 Gmail Recent Messages

◇  Fetching recent Gmail messages...
│  Found 0 new messages
│
└  Done ✅

ℹ  No new messages since last check

✨ Gmail check complete!
```

## Integration with Workflow

The Gmail command can be integrated into automation scripts:

```bash
#!/bin/bash
# Check Gmail every hour

while true; do
  echo "Checking Gmail..."
  bun run cli gmail

  # Wait 1 hour
  sleep 3600
done
```

Or with cron:

```bash
# Check Gmail every hour
0 * * * * cd /path/to/emails && bun run cli gmail >> gmail.log 2>&1
```

## Files Created

- `.gmail-last-run`: Timestamp file (plain text, ISO format)
  - Location: Project root directory
  - Contains: Last execution timestamp
  - Example content: `2024-11-17T18:30:00.000Z`

## Troubleshooting

### "Gmail credentials not found in .env file"

**Solution**: Add the required credentials to your `.env` file:

```bash
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
```

### "Failed to fetch Gmail messages: invalid_grant"

**Causes**:

- Refresh token expired or revoked
- OAuth consent screen not configured correctly

**Solution**:

1. Regenerate refresh token using OAuth playground
2. Ensure app is not in "Testing" mode (or add yourself as test user)
3. Check that Gmail API is enabled

### "Gmail API error: quota exceeded"

**Cause**: Exceeded Gmail API quota limits

**Solution**:

- Wait for quota to reset (daily quota)
- Reduce frequency of command execution
- Request quota increase in Google Cloud Console

### No messages returned on first run

**Possible causes**:

- No messages in inbox
- Query filter too restrictive
- Time zone issues

**Solution**: Check Gmail UI to verify messages exist

## API Limits

Gmail API has the following quotas (as of 2024):

- **Daily quota**: 1 billion quota units/day
- **Per-user rate limit**: 250 quota units per user per second
- **Messages.list**: 5 quota units per request
- **Messages.get**: 5 quota units per request

With default settings (100 messages max), each execution uses approximately:

- 1 list call = 5 units
- Up to 100 get calls = 500 units
- **Total**: ~505 units per execution

This allows ~2 million executions per day (well within limits for personal use).

## Security Notes

- **Credentials**: Never commit `.env` file with real credentials
- **Refresh Token**: Treat like a password - it provides long-term access
- **Scope**: Uses `gmail.readonly` scope (read-only access)
- **Token Storage**: Refresh token stored in `.env` file (ensure proper file permissions)

## Testing

Unit tests are located in:

```
src/infrastructure/tests/unit/test-fetch-recent-gmails-use-case.ts
```

Run tests:

```bash
bun test ./src/infrastructure/tests/unit/test-fetch-recent-gmails-use-case.ts
```

Test coverage:

- ✅ First run (no previous timestamp)
- ✅ Incremental fetching (with previous timestamp)
- ✅ Timestamp persistence
- ✅ Empty results handling
- ✅ Error handling

## Related Documentation

- [TDD Guide](../TDD.md) - Testing approach used
- [Architecture Testing](../ARCHITECTURE_TESTING.md) - Hexagonal architecture
- [README](../README.md) - Project overview

## Future Enhancements

Possible improvements:

- Filter by sender, subject, or labels
- Export to CSV/Notion like other commands
- Mark messages as read
- Support for multiple Gmail accounts
- Search by date range
- Message body extraction (not just snippet)

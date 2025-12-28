# API curl Examples

The API server runs on `http://localhost:3000`.

## Authentication

The API uses `better-auth` which sets a signed session cookie. You need to:
1. Sign in to get the session cookie from the `Set-Cookie` header
2. Use that cookie in subsequent requests

### Sign Up

```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### Sign In

```bash
# Sign in and capture the session cookie
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# The session token is in the Set-Cookie header as:
# better-auth.session_token=<token>.<signature>
```

### Using the Session Cookie

You can either:
1. Use `-b cookies.txt` if you saved cookies with `-c`
2. Copy the cookie from Chrome DevTools (Network tab) and use `--cookie`

```bash
# Option 1: Using saved cookie file
curl http://localhost:3000/api/todos -b cookies.txt | jq

# Option 2: Using cookie directly (from Chrome DevTools)
curl http://localhost:3000/api/todos \
  --cookie "better-auth.session_token=<token>.<signature>" | jq
```

## Todos

### Get All Todos

```bash
curl http://localhost:3000/api/todos -b cookies.txt | jq
```

Response:
```json
[
  {
    "id": "beba5b65-5b99-4a32-8195-34e7c7c52e7d",
    "userId": "xwFAvbNoCGNmZabbEsfvwWfiWgMltZnB",
    "title": "My todo",
    "subtitle": null,
    "description": "Description here",
    "completed": false,
    "createdAt": "2025-11-24T20:15:27.664Z",
    "updatedAt": "2025-11-24T20:15:27.664Z"
  }
]
```

## Bookmarks

### Create a Bookmark

```bash
curl -X POST http://localhost:3000/api/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://example.com",
    "tags": ["tag1", "tag2"],
    "summary": "This is a summary of the bookmark."
  }' \
  -b cookies.txt | jq
```

### Get All Bookmarks

```bash
curl http://localhost:3000/api/bookmarks -b cookies.txt | jq
```

Response:
```json
[
  {
    "url": "http://example.com",
    "sourceAdapter": "Other",
    "tags": ["tag1", "tag2"],
    "summary": "This is a summary of the bookmark.",
    "rawContent": "",
    "createdAt": "2025-11-25T13:49:23.183Z",
    "updatedAt": "2025-11-25T13:49:23.183Z",
    "userId": "xwFAvbNoCGNmZabbEsfvwWfiWgMltZnB"
  }
]
```

## Configuration

### Get All Config Keys

```bash
curl http://localhost:3000/api/config/keys -b cookies.txt | jq
```

### Get Config Value

```bash
curl http://localhost:3000/api/config/SOME_KEY -b cookies.txt | jq
```

## Workflows

### Start a Workflow

```bash
curl -X POST http://localhost:3000/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "preset": "gmail",
    "filter": {
      "email": "user@example.com"
    }
  }' \
  -b cookies.txt | jq
```

### Get Workflow Task Status

```bash
curl http://localhost:3000/api/workflows/<task-id> -b cookies.txt | jq
```

## Session Renewal Script

Save this script to automatically renew your session when it expires:

```bash
#!/bin/bash
# renew-session.sh - Renew platform API session
# Usage: ./renew-session.sh [email] [password]

API_URL="${PLATFORM_API_URL:-http://localhost:3000}"
SESSION_FILE="$HOME/.platform-cli/session.json"
COOKIES_FILE="$HOME/.platform-cli/cookies.txt"

# Default credentials (override with arguments or env vars)
EMAIL="${1:-${PLATFORM_EMAIL:-test@example.com}}"
PASSWORD="${2:-${PLATFORM_PASSWORD:-password123}}"

# Create config directory if needed
mkdir -p "$(dirname "$SESSION_FILE")"

# Sign in and capture both cookies and response
echo "Signing in as $EMAIL..."
RESPONSE=$(curl -s -X POST "$API_URL/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c "$COOKIES_FILE" \
  -D -)

# Extract session token from Set-Cookie header
SESSION_TOKEN=$(echo "$RESPONSE" | grep -i 'set-cookie.*better-auth.session_token' | \
  sed 's/.*better-auth.session_token=\([^;]*\).*/\1/')

if [ -z "$SESSION_TOKEN" ]; then
  echo "Failed to get session token. Check credentials."
  exit 1
fi

# Extract user info from response body
USER_ID=$(echo "$RESPONSE" | tail -1 | jq -r '.user.id // empty')
USER_EMAIL=$(echo "$RESPONSE" | tail -1 | jq -r '.user.email // empty')

# Save session to JSON file (CLI format)
cat > "$SESSION_FILE" << EOF
{
  "sessionToken": "$SESSION_TOKEN",
  "userId": "$USER_ID",
  "email": "$USER_EMAIL"
}
EOF

echo "Session renewed successfully!"
echo "  Session file: $SESSION_FILE"
echo "  Cookies file: $COOKIES_FILE"

# Test the session
echo ""
echo "Testing session..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/bookmarks" -b "$COOKIES_FILE")

if [ "$HTTP_CODE" = "200" ]; then
  echo "Session is valid!"
else
  echo "Warning: Session test returned HTTP $HTTP_CODE"
fi
```

Make it executable and run:

```bash
chmod +x renew-session.sh
./renew-session.sh your@email.com yourpassword
```

Or set environment variables:

```bash
export PLATFORM_EMAIL="your@email.com"
export PLATFORM_PASSWORD="yourpassword"
./renew-session.sh
```

## Tips

- Use `| jq` to pretty-print JSON responses
- Use `-v` flag to see headers (useful for debugging auth)
- Cookie format: `better-auth.session_token=<token>.<signature>` (URL-encoded)
- Session tokens expire - re-authenticate if you get 401/403 errors
- Run `renew-session.sh` to quickly refresh an expired session

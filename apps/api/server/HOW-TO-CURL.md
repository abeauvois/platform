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

## Ingestion

### Start an Ingest Job

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "preset": "gmail",
    "options": {
      "filter": {
        "email": "user@example.com"
      }
    }
  }' \
  -b cookies.txt | jq
```

### Get Job Status

```bash
curl http://localhost:3000/api/ingest/<job-id>/status -b cookies.txt | jq
```

## Tips

- Use `| jq` to pretty-print JSON responses
- Use `-v` flag to see headers (useful for debugging auth)
- Cookie format: `better-auth.session_token=<token>.<signature>` (URL-encoded)
- Session tokens expire - re-authenticate if you get 401/403 errors

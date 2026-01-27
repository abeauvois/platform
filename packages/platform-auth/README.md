# @abeauvois/platform-auth

Authentication package built on [better-auth](https://better-auth.com) with bearer token support for cross-service authentication.

## Features

- Email/password authentication
- Session management with secure cookies
- **Bearer tokens** for cross-service auth (via bearer plugin)
- OpenAPI documentation (via openAPI plugin)
- Cross-origin cookie support for production deployments

## Installation

```bash
bun add @abeauvois/platform-auth
```

## Usage

### Creating an Auth Instance

```typescript
import { createAuth } from '@abeauvois/platform-auth';
import { db } from '@abeauvois/platform-db';
import * as schema from '@abeauvois/platform-db/schema';

const auth = createAuth({
  db,
  schema,
  provider: 'pg', // or 'mysql', 'sqlite'
  trustedOrigins: [
    'https://your-app.com',
    'https://trading.your-app.com',
  ],
});
```

### Using with Hono

```typescript
import { Hono } from 'hono';

const app = new Hono();

// Mount auth routes
app.on(['POST', 'GET', 'OPTIONS'], '/api/auth/*', async (c) => {
  return auth.handler(c.req.raw);
});
```

### Auth Middleware

```typescript
import { createAuthMiddleware } from '@abeauvois/platform-auth';

const authMiddleware = createAuthMiddleware(auth);

// Protect routes
app.use('/api/protected/*', authMiddleware);

// Access user in handlers
app.get('/api/protected/profile', (c) => {
  const user = c.get('user');
  return c.json({ user });
});
```

## Cross-Service Authentication

Platform serves as the central auth provider. Other services validate tokens issued by platform.

### How It Works

1. User signs in to platform → gets session cookie + bearer token
2. Bearer token is returned in `set-auth-token` response header
3. Client stores bearer token and sends it to other services
4. Other services validate token using shared `BETTER_AUTH_SECRET`

### Client Setup (e.g., trading-client)

```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: 'https://platform-api.example.com',
  fetchOptions: {
    credentials: 'include',
    onSuccess: (ctx) => {
      // Capture bearer token for cross-service auth
      const token = ctx.response.headers.get('set-auth-token');
      if (token) {
        localStorage.setItem('auth_token', token);
      }
    },
  },
});
```

### Service Setup (e.g., trading-server)

```typescript
import { createAuth } from '@abeauvois/platform-auth';

// Use the SAME secret as platform
const auth = createAuth({
  db,
  schema,
  provider: 'pg',
  trustedOrigins: ['https://trading-client.example.com'],
});

// Auth middleware validates bearer tokens automatically
app.use('/api/*', createAuthMiddleware(auth));
```

## Configuration

### Environment Variables

| Variable            | Required | Description                    |
|---------------------|----------|--------------------------------|
| BETTER_AUTH_SECRET  | Yes      | Secret for signing tokens      |
| AUTH_SECRET         | Alt      | Alternative to above           |

**Important:** All services that validate tokens must share the same `BETTER_AUTH_SECRET`.

### Production Cookie Settings

In production (`APP_ENV=production`), cookies are configured for cross-origin:

- `SameSite=None` - allows cookies in cross-origin requests
- `Secure=true` - required for SameSite=None
- `HttpOnly=true` - prevents XSS attacks

## Plugins

The auth instance includes:

- **bearer()** - Enables bearer token authentication
- **openAPI()** - Generates OpenAPI documentation at `/api/auth/reference`

## API Reference

See the generated OpenAPI docs at `/api/auth/reference` when running your server.

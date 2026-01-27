# @abeauvois/platform-sdk

Platform API client SDK for authentication and API communication.

## Features

- Full TypeScript support
- Multiple authentication modes:
  - Browser cookies (`credentials: 'include'`)
  - Bearer tokens (`getToken` function)
  - Manual cookie headers (for CLI)
- Workflow execution with polling
- Config provider for environment variables

## Installation

```bash
bun add @abeauvois/platform-sdk
```

## Usage

### Browser with Cookies (Same-Origin)

```typescript
import { PlatformApiClient } from '@abeauvois/platform-sdk';

const client = new PlatformApiClient({
  baseUrl: 'http://localhost:3000',
  credentials: 'include', // Browser handles cookies
});

// Auth
await client.signIn({ email: 'user@example.com', password: 'secret' });
const session = await client.getSession();
```

### Cross-Service with Bearer Token

For cross-origin requests where cookies don't work (e.g., trading-client → trading-server):

```typescript
import { PlatformApiClient } from '@abeauvois/platform-sdk';

const client = new PlatformApiClient({
  baseUrl: 'http://localhost:3001',
  getToken: () => localStorage.getItem('auth_token'),
});

// Token is sent as: Authorization: Bearer <token>
const data = await client.authenticatedRequest('/api/protected', {
  method: 'GET',
});
```

### CLI with Manual Token

```typescript
import { PlatformApiClient } from '@abeauvois/platform-sdk';

const client = new PlatformApiClient({
  baseUrl: 'http://localhost:3000',
  sessionToken: 'your-session-token', // From file or env
  credentials: 'omit', // Don't use browser cookies
});
```

## Authentication Modes

| Mode | Config | Use Case |
|------|--------|----------|
| Browser Cookies | `credentials: 'include'` | Same-origin web apps |
| Bearer Token | `getToken: () => string` | Cross-origin, cross-service |
| Manual Cookie | `sessionToken` + `credentials: 'omit'` | CLI, scripts |

**Priority:** `getToken` > `sessionToken` > browser cookies

## API Reference

### BaseClient Methods

```typescript
// Set/get session token
client.setSessionToken(token: string): void
client.getSessionToken(): string | undefined
client.clearSessionToken(): void

// Make authenticated requests
client.authenticatedRequest<T>(endpoint: string, options: RequestInit): Promise<T>
```

### PlatformApiClient Methods

```typescript
// Authentication
await client.signIn({ email, password }): Promise<AuthResult>
await client.signUp({ name, email, password }): Promise<AuthResult>
await client.signOut(): Promise<void>
await client.getSession(): Promise<Session | null>

// Workflows
await client.createWorkflow(preset, options): Promise<Workflow>
await client.getWorkflowStatus(taskId): Promise<WorkflowStatus>

// Config
await client.getConfig(key): Promise<string>
await client.getConfigKeys(): Promise<string[]>
```

## Config Provider

Load configuration from the API server:

```typescript
import { ApiConfigProvider } from '@abeauvois/platform-sdk';

const config = new ApiConfigProvider({
  apiUrl: 'http://localhost:3000',
  sessionToken: 'your-token',
});

await config.load();
const apiKey = config.get('ANTHROPIC_API_KEY');
```

## Extending with Custom Clients

```typescript
import { BaseClient } from '@abeauvois/platform-sdk';

export class MyServiceClient extends BaseClient {
  async getItems(): Promise<Item[]> {
    return this.authenticatedRequest('/api/items', {
      method: 'GET',
    });
  }
}
```

## Related Packages

- [@abeauvois/platform-trading-sdk](../trading-sdk) - Trading API client
- [@abeauvois/platform-auth](../platform-auth) - Authentication package

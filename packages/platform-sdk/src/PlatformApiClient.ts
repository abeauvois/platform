import { AuthClient } from './clients/AuthClient.js';
import { BookmarkClient } from './clients/BookmarkClient.js';
import { ConfigClient } from './clients/ConfigClient.js';
import { WorkflowClient } from './clients/WorkflowClient.js';
import { SourcesClient } from './clients/SourcesClient.js';
import type { AuthResponse, ILogger, SignInData, SignUpData } from './types.js';
import type { BaseClient } from './clients/BaseClient.js';

interface PlatformApiClientConfig {
    baseUrl: string;
    sessionToken?: string;
    logger?: ILogger;
    /**
     * Fetch credentials mode for cookie handling.
     * - 'include': Browser sends cookies automatically (for web apps)
     * - 'omit': Manual token management via Cookie header (for CLI apps)
     *
     * @default 'omit'
     */
    credentials?: 'include' | 'omit' | 'same-origin';
}

/**
 * Auth client wrapper that syncs token to all clients after auth operations
 */
class SyncedAuthClient {
    constructor(
        private readonly authClient: AuthClient,
        private readonly allClients: Array<BaseClient>,
    ) { }

    async signIn(data: SignInData): Promise<AuthResponse> {
        const response = await this.authClient.signIn(data);
        this.syncToken(response.sessionToken);
        return response;
    }

    async signUp(data: SignUpData): Promise<AuthResponse> {
        const response = await this.authClient.signUp(data);
        this.syncToken(response.sessionToken);
        return response;
    }

    async signOut(): Promise<void> {
        await this.authClient.signOut();
        this.clearAllTokens();
    }

    getSessionToken(): string | undefined {
        return this.authClient.getSessionToken();
    }

    private syncToken(token: string): void {
        for (const client of this.allClients) {
            client.setSessionToken(token);
        }
    }

    private clearAllTokens(): void {
        for (const client of this.allClients) {
            client.clearSessionToken();
        }
    }
}

/**
 * Platform API Client
 * Provides access to all platform services through composed clients
 *
 * @example
 * ```typescript
 * const client = new PlatformApiClient({
 *     baseUrl: 'http://localhost:3000',
 *     logger: console,
 * });
 *
 * // Authentication
 * await client.auth.signIn({ email: 'user@example.com', password: 'secret' });
 *
 * // Bookmarks
 * const bookmarks = await client.bookmarks.fetchAll();
 *
 * // Config
 * const config = await client.config.fetchAll();
 *
 * // Workflow
 * const workflow = client.workflow.create('gmail', { filter: { email: 'user@example.com' } });
 * await workflow.execute();
 * ```
 */
export class PlatformApiClient {
    readonly auth: SyncedAuthClient;
    readonly bookmarks: BookmarkClient;
    readonly config: ConfigClient;
    readonly workflow: WorkflowClient;
    readonly sources: SourcesClient;

    private readonly clients: Array<BaseClient>
    private readonly authClient: AuthClient;

    constructor(config: PlatformApiClientConfig) {
        const clientConfig = {
            baseUrl: config.baseUrl,
            sessionToken: config.sessionToken,
            logger: config.logger,
            credentials: config.credentials,
        };

        this.authClient = new AuthClient(clientConfig);
        this.bookmarks = new BookmarkClient(clientConfig);
        this.config = new ConfigClient(clientConfig);
        this.workflow = new WorkflowClient(clientConfig);
        this.sources = new SourcesClient(clientConfig);

        this.clients = [this.authClient, this.bookmarks, this.config, this.workflow, this.sources];
        this.auth = new SyncedAuthClient(this.authClient, this.clients);
    }

    /**
     * Update session token for all clients
     */
    setSessionToken(token: string): void {
        for (const client of this.clients) {
            client.setSessionToken(token);
        }
    }

    /**
     * Clear session token from all clients
     */
    clearSessionToken(): void {
        for (const client of this.clients) {
            client.clearSessionToken();
        }
    }

    /**
     * Get current session token
     */
    getSessionToken(): string | undefined {
        return this.auth.getSessionToken();
    }
}

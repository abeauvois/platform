import type { SignInData, SignUpData, AuthResponse, ILogger } from './types.js';
import { AuthClient } from './clients/AuthClient.js';
import { BookmarkClient } from './clients/BookmarkClient.js';
import { ConfigClient } from './clients/ConfigClient.js';
import { IngestClient } from './clients/IngestClient.js';
import { SourcesClient } from './clients/SourcesClient.js';
import type { BaseClient } from './clients/BaseClient.js';

interface PlatformApiClientConfig {
    baseUrl: string;
    sessionToken?: string;
    logger: ILogger;
}

/**
 * Auth client wrapper that syncs token to all clients after auth operations
 */
class SyncedAuthClient {
    constructor(
        private readonly authClient: AuthClient,
        private readonly allClients: BaseClient[],
    ) {}

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
 * // Ingestion
 * const workflow = client.ingest.create('gmail', { filter: { email: 'user@example.com' } });
 * await workflow.execute();
 * ```
 */
export class PlatformApiClient {
    readonly auth: SyncedAuthClient;
    readonly bookmarks: BookmarkClient;
    readonly config: ConfigClient;
    readonly ingest: IngestClient;
    readonly sources: SourcesClient;

    private readonly clients: BaseClient[];
    private readonly authClient: AuthClient;

    constructor(config: PlatformApiClientConfig) {
        const clientConfig = {
            baseUrl: config.baseUrl,
            sessionToken: config.sessionToken,
            logger: config.logger,
        };

        this.authClient = new AuthClient(clientConfig);
        this.bookmarks = new BookmarkClient(clientConfig);
        this.config = new ConfigClient(clientConfig);
        this.ingest = new IngestClient(clientConfig);
        this.sources = new SourcesClient(clientConfig);

        this.clients = [this.authClient, this.bookmarks, this.config, this.ingest, this.sources];
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

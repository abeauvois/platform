import type {
    SignUpData,
    SignInData,
    AuthResponse,
    BookmarkData,
    ConfigResponse,
    ConfigValueResponse,
    ConfigBatchResponse,
    ConfigKeysResponse,
    WorkflowPreset,
    IngestOptions,
    IIngestWorkflow,
    ILogger,
} from './types.js';
import { IngestWorkflow } from './IngestWorkflow.js';

/**
 * Bookmark type for API responses
 */
interface Bookmark {
    url: string;
    sourceAdapter: string;
    tags: string[];
    summary?: string;
    rawContent?: string;
    createdAt?: Date;
    updatedAt?: Date;
    contentType?: string;
    userId?: string;
    id?: string;
}

interface PlatformApiClientConfig {
    baseUrl: string;
    sessionToken?: string;
    logger: ILogger;
}

/**
 * Generic Platform API Client
 * Provides methods for authentication and bookmark operations
 * Can be used with or without authentication (sessionToken)
 */
export class PlatformApiClient {
    protected baseUrl: string;
    protected sessionToken?: string;
    protected logger: ILogger;

    constructor(config: PlatformApiClientConfig) {
        this.baseUrl = config.baseUrl;
        this.sessionToken = config.sessionToken;
        this.logger = config.logger;
    }

    /**
     * Update session token for authenticated requests
     */
    setSessionToken(token: string): void {
        this.sessionToken = token;
    }

    /**
     * Clear session token
     */
    clearSessionToken(): void {
        this.sessionToken = undefined;
    }

    // ============================================
    // Authentication Methods (Public API)
    // ============================================

    /**
     * Sign up a new user
     * @param data User registration data
     * @returns Authentication response with session token
     */
    async signUp(data: SignUpData): Promise<AuthResponse> {
        try {
            this.logger.info('Signing up new user...');

            const response = await fetch(`${this.baseUrl}/api/auth/sign-up/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Sign up failed: ${response.statusText}`);
            }

            const responseData = await response.json() as { user?: { id: string; email: string } };
            const sessionToken = this.extractSessionToken(response);

            if (!sessionToken || !responseData.user) {
                throw new Error('Invalid response from server');
            }

            const authResponse: AuthResponse = {
                sessionToken,
                userId: responseData.user.id,
                email: responseData.user.email,
            };

            // Set session token on the client instance
            this.sessionToken = sessionToken;

            this.logger.info('Sign up successful');
            return authResponse;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Sign up error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Sign in an existing user
     * @param data User credentials
     * @returns Authentication response with session token
     */
    async signIn(data: SignInData): Promise<AuthResponse> {
        try {
            this.logger.info('Signing in...');

            const response = await fetch(`${this.baseUrl}/api/auth/sign-in/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Sign in failed: ${response.statusText}`);
            }

            const responseData = await response.json() as { user?: { id: string; email: string } };
            const sessionToken = this.extractSessionToken(response);

            if (!sessionToken || !responseData.user) {
                throw new Error('Invalid response from server');
            }

            const authResponse: AuthResponse = {
                sessionToken,
                userId: responseData.user.id,
                email: responseData.user.email,
            };

            // Set session token on the client instance
            this.sessionToken = sessionToken;

            this.logger.info('Sign in successful');
            return authResponse;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Sign in error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Sign out current user
     * Requires sessionToken to be set
     */
    async signOut(): Promise<void> {
        try {
            this.logger.info('Signing out...');

            await this.authenticatedRequest<void>('/api/auth/sign-out', {
                method: 'POST',
            });

            this.clearSessionToken();
            this.logger.info('Sign out successful');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Sign out error: ${errorMessage}`);
            throw error;
        }
    }

    // ============================================
    // Bookmark Methods (Authenticated)
    // ============================================

    /**
     * Fetch all bookmarks for authenticated user
     * Requires sessionToken to be set
     */
    async fetchBookmarks(): Promise<Bookmark[]> {
        try {
            this.logger.info('Fetching bookmarks...');

            const bookmarks = await this.authenticatedRequest<Bookmark[]>('/api/bookmarks', {
                method: 'GET',
            });

            this.logger.info(`Fetched ${bookmarks.length} bookmarks`);
            return bookmarks;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching bookmarks: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Create a new bookmark
     * Requires sessionToken to be set
     */
    async createBookmark(data: BookmarkData): Promise<Bookmark> {
        try {
            this.logger.info('Creating bookmark...');

            const bookmark = await this.authenticatedRequest<Bookmark>('/api/bookmarks', {
                method: 'POST',
                body: JSON.stringify(data),
            });

            this.logger.info('Bookmark created successfully');
            return bookmark;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error creating bookmark: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Update an existing bookmark
     * Requires sessionToken to be set
     */
    async updateBookmark(id: string, data: Partial<BookmarkData>): Promise<Bookmark> {
        try {
            this.logger.info(`Updating bookmark ${id}...`);

            const bookmark = await this.authenticatedRequest<Bookmark>(`/api/bookmarks/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });

            this.logger.info('Bookmark updated successfully');
            return bookmark;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error updating bookmark: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Delete a bookmark
     * Requires sessionToken to be set
     */
    async deleteBookmark(id: string): Promise<void> {
        try {
            this.logger.info(`Deleting bookmark ${id}...`);

            await this.authenticatedRequest<void>(`/api/bookmarks/${id}`, {
                method: 'DELETE',
            });

            this.logger.info('Bookmark deleted successfully');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error deleting bookmark: ${errorMessage}`);
            throw error;
        }
    }

    // ============================================
    // Ingestion Methods
    // ============================================

    /**
     * Create an ingestion workflow for processing data from a source
     *
     * @param preset - Workflow preset (e.g., 'gmail', 'full', 'quick')
     * @param options - Ingestion options including filters and step toggles
     * @returns An IngestWorkflow that can be executed with lifecycle hooks
     *
     * @example
     * ```typescript
     * const workflow = client.ingest('gmail', {
     *     filter: { email: 'user@example.com' },
     *     skipAnalysis: false,
     *     skipTwitter: true
     * });
     *
     * await workflow.execute({
     *     onStart: ({ logger }) => logger.info('Starting...'),
     *     onComplete: ({ logger }) => logger.info('Done!'),
     *     onError: ({ logger }) => logger.error('Failed!')
     * });
     * ```
     */
    ingest(preset: WorkflowPreset, options: IngestOptions = {}): IIngestWorkflow {
        return new IngestWorkflow({
            preset,
            options,
            logger: this.logger,
            baseUrl: this.baseUrl,
            sessionToken: this.sessionToken,
        });
    }

    // ============================================
    // Configuration Methods (Authenticated)
    // ============================================

    /**
     * Fetch all available configuration values
     * Requires sessionToken to be set
     */
    async fetchConfig(): Promise<ConfigResponse> {
        try {
            this.logger.info('Fetching configuration...');

            const config = await this.authenticatedRequest<ConfigResponse>('/api/config', {
                method: 'GET',
            });

            this.logger.info(`Fetched ${config.keys.length} config keys`);
            return config;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching config: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Fetch a specific configuration value by key
     * Requires sessionToken to be set
     */
    async fetchConfigValue(key: string): Promise<ConfigValueResponse> {
        try {
            this.logger.info(`Fetching config key: ${key}...`);

            const config = await this.authenticatedRequest<ConfigValueResponse>(`/api/config/${key}`, {
                method: 'GET',
            });

            this.logger.info(`Fetched config key: ${key}`);
            return config;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching config key ${key}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Fetch multiple configuration values by keys
     * Requires sessionToken to be set
     */
    async fetchConfigBatch(keys: string[]): Promise<ConfigBatchResponse> {
        try {
            this.logger.info(`Fetching ${keys.length} config keys...`);

            const config = await this.authenticatedRequest<ConfigBatchResponse>('/api/config/batch', {
                method: 'POST',
                body: JSON.stringify({ keys }),
            });

            this.logger.info(`Fetched ${config.found.length} config keys, ${config.missing.length} missing`);
            return config;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching config batch: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get list of available configuration keys (without values)
     * Requires sessionToken to be set
     */
    async fetchConfigKeys(): Promise<ConfigKeysResponse> {
        try {
            this.logger.info('Fetching available config keys...');

            const response = await this.authenticatedRequest<ConfigKeysResponse>('/api/config/keys', {
                method: 'GET',
            });

            this.logger.info(`${response.total} config keys available`);
            return response;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error fetching config keys: ${errorMessage}`);
            throw error;
        }
    }

    // ============================================
    // Private Helper Methods
    // ============================================

    /**
     * Make an authenticated request
     * Requires sessionToken to be set
     */
    protected async authenticatedRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
        if (!this.sessionToken) {
            throw new Error('Authentication required. Please sign in first.');
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `better-auth.session_token=${this.sessionToken}`,
                ...options.headers,
            },
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Authentication failed. Please sign in again.');
            }
            throw new Error(`Request failed: ${response.statusText}`);
        }

        // Handle empty responses (e.g., DELETE requests)
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return undefined as T;
        }

        return await response.json() as T;
    }

    /**
     * Extract session token from response headers
     */
    private extractSessionToken(response: Response): string | null {
        const setCookie = response.headers.get('set-cookie');
        if (!setCookie) return null;

        // Parse session token from better-auth cookie
        const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
        return match ? match[1] : null;
    }
}

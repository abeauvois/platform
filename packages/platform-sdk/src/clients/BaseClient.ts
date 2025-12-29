import type { ILogger } from '../types.js';
import { ApiClient } from './ApiClient.js';

export interface BaseClientConfig {
    baseUrl: string;
    sessionToken?: string;
    logger: ILogger;
}

/**
 * Base client with shared authentication logic and token management.
 * Uses ApiClient internally for HTTP requests.
 */
export class BaseClient {
    protected baseUrl: string;
    protected logger: ILogger;
    protected apiClient: ApiClient;

    constructor(config: BaseClientConfig) {
        this.baseUrl = config.baseUrl;
        this.logger = config.logger;
        this.apiClient = new ApiClient({
            baseUrl: config.baseUrl,
            sessionToken: config.sessionToken,
        });
    }

    /**
     * Update session token for authenticated requests
     */
    setSessionToken(token: string): void {
        this.apiClient.setSessionToken(token);
    }

    /**
     * Clear session token
     */
    clearSessionToken(): void {
        this.apiClient.clearSessionToken();
    }

    /**
     * Get current session token
     */
    getSessionToken(): string | undefined {
        return this.apiClient.getSessionToken();
    }

    /**
     * Get the underlying ApiClient for sharing with other components
     */
    getApiClient(): ApiClient {
        return this.apiClient;
    }

    /**
     * Make an authenticated request.
     * Requires sessionToken to be set.
     */
    protected async authenticatedRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
        if (!this.apiClient.getSessionToken()) {
            throw new Error('Authentication required. Please sign in first.');
        }
        return this.apiClient.request<T>(endpoint, options);
    }

    /**
     * Extract session token from Set-Cookie header
     */
    protected extractSessionTokenFromHeaders(response: Response): string | null {
        return this.apiClient.extractSessionTokenFromHeaders(response);
    }
}

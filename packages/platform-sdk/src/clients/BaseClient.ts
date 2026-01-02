import type { ILogger } from '../types.js';
import { ApiClient } from './ApiClient.js';

export interface BaseClientConfig {
    baseUrl: string;
    sessionToken?: string;
    logger?: ILogger;
    /**
     * Fetch credentials mode for cookie handling.
     * @see ApiClientConfig.credentials
     */
    credentials?: 'include' | 'omit' | 'same-origin';
}

/** No-op logger for when no logger is provided */
const noopLogger: ILogger = {
    info: () => {},
    warning: () => {},
    error: () => {},
    debug: () => {},
    await: () => ({ start: () => {}, update: () => {}, stop: () => {} }),
};

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
        this.logger = config.logger ?? noopLogger;
        this.apiClient = new ApiClient({
            baseUrl: config.baseUrl,
            sessionToken: config.sessionToken,
            credentials: config.credentials,
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
     * When using browser cookies (credentials: 'include'), auth is handled automatically.
     * When using manual token management, requires sessionToken to be set.
     */
    protected async authenticatedRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
        // Skip token check when browser handles cookies automatically
        if (!this.apiClient.usesBrowserCookies() && !this.apiClient.getSessionToken()) {
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

export interface ApiClientConfig {
    baseUrl: string;
    sessionToken?: string;
    /**
     * Fetch credentials mode for cookie handling.
     * - 'include': Browser sends cookies automatically (for web apps with same-origin or CORS)
     * - 'omit': Never send cookies, use manual token in Cookie header (for CLI apps)
     * - 'same-origin': Send cookies only for same-origin requests (default browser behavior)
     *
     * @default 'omit' - Manual token management for backwards compatibility
     */
    credentials?: 'include' | 'omit' | 'same-origin';
    /**
     * Function to get bearer token for cross-service authentication.
     * When provided, sends Authorization: Bearer <token> header.
     * Used for platform auth across different services (e.g., trading-server using platform auth).
     */
    getToken?: () => string | null;
}

/**
 * Low-level HTTP client for making authenticated API requests.
 * Can be shared across SDK components via composition.
 */
export class ApiClient {
    private baseUrl: string;
    private sessionToken?: string;
    private readonly credentials: 'include' | 'omit' | 'same-origin';
    private readonly getToken?: () => string | null;

    constructor(config: ApiClientConfig) {
        this.baseUrl = config.baseUrl;
        this.sessionToken = config.sessionToken;
        this.credentials = config.credentials ?? 'omit';
        this.getToken = config.getToken;
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

    /**
     * Get current session token
     */
    getSessionToken(): string | undefined {
        return this.sessionToken;
    }

    /**
     * Check if using browser cookie authentication.
     * When true, the browser handles auth via cookies and no manual token is needed.
     */
    usesBrowserCookies(): boolean {
        return this.credentials === 'include' || this.credentials === 'same-origin';
    }

    /**
     * Make an HTTP request to the API.
     * Authentication is handled based on the credentials mode:
     * - 'include': Browser sends cookies automatically
     * - 'omit': Manual Cookie header with sessionToken (for CLI)
     * - getToken: Bearer token in Authorization header (for cross-service auth)
     */
    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };

        // Bearer token takes priority for cross-service authentication
        const bearerToken = this.getToken?.();
        if (bearerToken) {
            headers['Authorization'] = `Bearer ${bearerToken}`;
        }
        // Fall back to Cookie header when not using browser cookie handling
        else if (this.sessionToken && this.credentials === 'omit') {
            headers['Cookie'] = `better-auth.session_token=${this.sessionToken}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
            credentials: this.credentials,
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Authentication failed. Please sign in again.');
            }
            const errorBody = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        // Handle empty responses (e.g., DELETE requests)
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return undefined as T;
        }

        return await response.json() as T;
    }

    /**
     * Extract session token from Set-Cookie header.
     * Useful for auth flows (sign in, sign up).
     */
    extractSessionTokenFromHeaders(response: Response): string | null {
        const setCookie = response.headers.get('set-cookie');
        if (!setCookie) return null;

        // Parse session token from better-auth cookie (includes signature)
        const match = /better-auth\.session_token=([^;]+)/.exec(setCookie);
        return match ? decodeURIComponent(match[1]) : null;
    }
}

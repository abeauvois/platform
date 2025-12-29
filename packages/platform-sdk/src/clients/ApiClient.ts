export interface ApiClientConfig {
    baseUrl: string;
    sessionToken?: string;
}

/**
 * Low-level HTTP client for making authenticated API requests.
 * Can be shared across SDK components via composition.
 */
export class ApiClient {
    private baseUrl: string;
    private sessionToken?: string;

    constructor(config: ApiClientConfig) {
        this.baseUrl = config.baseUrl;
        this.sessionToken = config.sessionToken;
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
     * Make an HTTP request to the API.
     * Authentication is optional - adds cookie only when sessionToken is set.
     */
    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };

        if (this.sessionToken) {
            headers['Cookie'] = `better-auth.session_token=${this.sessionToken}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
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

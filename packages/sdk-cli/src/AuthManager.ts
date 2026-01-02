import { PlatformApiClient } from '@platform/sdk';
import { FileSessionStorage } from './adapters/FileSessionStorage.js';
import type { StoredSession } from './adapters/FileSessionStorage.js';
import type { ILogger } from '@platform/platform-domain';
import type { AuthResponse, ISessionStorage } from '@platform/sdk';

export interface AuthManagerConfig {
    /** Base URL of the platform API */
    baseUrl: string;
    /** Logger for output messages */
    logger?: ILogger;
    /** Session storage adapter (default: FileSessionStorage) */
    sessionStorage?: ISessionStorage;
}

/** No-op logger for when no logger is provided */
const noopLogger: ILogger = Object.freeze({
    info: () => { },
    warning: () => { },
    error: () => { },
    debug: () => { },
    await: () => ({
        start: () => { },
        update: () => { },
        stop: () => { },
    }),
});

/**
 * Authentication manager for CLI applications.
 * Handles login, logout, and session persistence.
 *
 * @example
 * ```typescript
 * const authManager = new AuthManager({
 *     baseUrl: 'http://localhost:3000',
 *     logger: myLogger,
 * });
 *
 * // Check for existing session
 * if (await authManager.isAuthenticated()) {
 *     const token = await authManager.getCurrentSession();
 *     // Use token to create authenticated client
 * } else {
 *     // Prompt user for credentials and login
 *     const response = await authManager.login(email, password);
 * }
 * ```
 */
export class AuthManager {
    private readonly baseUrl: string;
    private readonly logger: ILogger;
    private readonly storage: ISessionStorage;
    private apiClient: PlatformApiClient | null = null;

    constructor(config: AuthManagerConfig) {
        this.baseUrl = config.baseUrl;
        this.logger = config.logger ?? noopLogger;
        this.storage = config.sessionStorage ?? new FileSessionStorage();
    }

    /**
     * Login with email and password.
     * Stores session token in the configured storage.
     */
    async login(email: string, password: string): Promise<AuthResponse> {
        const client = this.getApiClient();

        try {
            const response = await client.auth.signIn({ email, password });

            // Store full session data if using FileSessionStorage
            if (this.storage instanceof FileSessionStorage) {
                this.storage.saveFullSession({
                    sessionToken: response.sessionToken,
                    userId: response.userId,
                    email: response.email,
                });
            } else {
                await this.storage.setToken(response.sessionToken);
            }

            this.logger.info(`Logged in as ${response.email}`);
            return response;
        } catch (error) {
            this.logger.error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }

    /**
     * Logout and clear stored session.
     */
    async logout(): Promise<void> {
        const token = await this.storage.getToken();

        if (token && token !== 'browser-managed') {
            try {
                const client = this.getApiClient();
                client.setSessionToken(token);
                await client.auth.signOut();
            } catch {
                // Ignore signout errors - we'll clear local storage anyway
            }
        }

        await this.storage.clearToken();
        this.logger.info('Logged out');
    }

    /**
     * Get the current session token, if any.
     */
    async getCurrentSession(): Promise<string | null> {
        return this.storage.getToken();
    }

    /**
     * Check if user is authenticated.
     */
    async isAuthenticated(): Promise<boolean> {
        return this.storage.hasSession();
    }

    /**
     * Get full session data (if using FileSessionStorage).
     * Returns null if not using FileSessionStorage or no session exists.
     */
    getFullSession(): StoredSession | null {
        if (this.storage instanceof FileSessionStorage) {
            return this.storage.getFullSession();
        }
        return null;
    }

    /**
     * Create an authenticated PlatformApiClient.
     * Throws if no session exists.
     */
    async createAuthenticatedClient(): Promise<PlatformApiClient> {
        const token = await this.storage.getToken();
        if (!token) {
            throw new Error('Not authenticated. Please login first.');
        }

        return new PlatformApiClient({
            baseUrl: this.baseUrl,
            sessionToken: token,
            logger: this.logger,
        });
    }

    private getApiClient(): PlatformApiClient {
        this.apiClient ??= new PlatformApiClient({
            baseUrl: this.baseUrl,
            logger: this.logger,
        });
        return this.apiClient;
    }
}

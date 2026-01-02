/**
 * Port for session token persistence.
 * Allows different storage mechanisms for different environments:
 * - CLI: File-based storage (~/.platform-cli/session.json)
 * - Web: Browser cookies (automatic) or in-memory
 */
export interface ISessionStorage {
    /**
     * Retrieve the current session token.
     * @returns The session token, or null if no session exists.
     */
    getToken: () => Promise<string | null>;

    /**
     * Store a session token.
     * @param token - The session token to store.
     */
    setToken: (token: string) => Promise<void>;

    /**
     * Clear the stored session token.
     */
    clearToken: () => Promise<void>;

    /**
     * Check if a valid session exists.
     * @returns True if a session token is stored.
     */
    hasSession: () => Promise<boolean>;
}

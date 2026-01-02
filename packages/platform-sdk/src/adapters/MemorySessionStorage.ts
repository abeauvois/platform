import type { ISessionStorage } from '../ports/ISessionStorage.js';

/**
 * In-memory session storage adapter.
 * Stores the session token in memory - useful for:
 * - Testing
 * - Short-lived sessions
 * - Cases where persistence isn't needed
 */
export class MemorySessionStorage implements ISessionStorage {
    private token: string | null = null;

    async getToken(): Promise<string | null> {
        return this.token;
    }

    async setToken(token: string): Promise<void> {
        this.token = token;
    }

    async clearToken(): Promise<void> {
        this.token = null;
    }

    async hasSession(): Promise<boolean> {
        return this.token !== null;
    }
}

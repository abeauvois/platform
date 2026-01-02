import type { ISessionStorage } from '../ports/ISessionStorage.js';

/**
 * Browser cookie session storage adapter.
 *
 * For web applications where the browser automatically manages cookies.
 * When using `credentials: 'include'` in fetch requests, the browser
 * automatically sends and receives cookies - no manual token management needed.
 *
 * This adapter tracks login state locally but doesn't actually store the token,
 * as the browser handles cookie storage and transmission automatically.
 */
export class BrowserCookieSessionStorage implements ISessionStorage {
    private loggedIn = false;

    async getToken(): Promise<string | null> {
        // Browser manages the actual token via cookies
        // Return a sentinel value to indicate we're logged in
        return this.loggedIn ? 'browser-managed' : null;
    }

    async setToken(_token: string): Promise<void> {
        // Token is stored in browser cookies automatically
        // We just track that we're now logged in
        this.loggedIn = true;
    }

    async clearToken(): Promise<void> {
        this.loggedIn = false;
    }

    async hasSession(): Promise<boolean> {
        return this.loggedIn;
    }
}

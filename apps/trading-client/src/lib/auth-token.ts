/**
 * Bearer token storage for cross-service authentication
 * Stores the auth token from platform API to use with trading-server
 */

const AUTH_TOKEN_KEY = 'platform_auth_token';

/** Save bearer token to localStorage */
export function saveAuthToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/** Get bearer token from localStorage */
export function getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

/** Clear bearer token from localStorage */
export function clearAuthToken(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
}

/** Check if bearer token exists */
export function hasAuthToken(): boolean {
    return !!getAuthToken();
}

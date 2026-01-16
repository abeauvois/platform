import { createAuthClient } from 'better-auth/react';
import { config } from './config';
import { saveAuthToken, clearAuthToken } from './auth-token';

export const authClient = createAuthClient({
    // In production, set baseURL to the auth API server
    // In development (empty string), better-auth uses relative URLs
    baseURL: config.authApiUrl || undefined,
    fetchOptions: {
        credentials: 'include',
        // Capture bearer token from auth responses
        onSuccess: (ctx) => {
            const token = ctx.response.headers.get('set-auth-token');
            if (token) {
                saveAuthToken(token);
            }
        },
    },
});

// Helper to sign out and clear token
export async function signOut() {
    clearAuthToken();
    await authClient.signOut();
}

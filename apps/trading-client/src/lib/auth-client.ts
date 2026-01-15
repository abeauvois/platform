import { createAuthClient } from 'better-auth/react';
import { config } from './config';

export const authClient = createAuthClient({
    // In production, set baseURL to the auth API server
    // In development (empty string), better-auth uses relative URLs
    baseURL: config.authApiUrl || undefined,
    fetchOptions: {
        credentials: 'include',
    },
});

import type { SignUpData, SignInData, AuthResponse } from '../types.js';
import { BaseClient, type BaseClientConfig } from './BaseClient.js';

/**
 * Authentication client for sign up, sign in, and sign out operations
 */
export class AuthClient extends BaseClient {
    constructor(config: BaseClientConfig) {
        super(config);
    }

    /**
     * Sign up a new user
     * @param data User registration data
     * @returns Authentication response with session token
     */
    async signUp(data: SignUpData): Promise<AuthResponse> {
        try {
            this.logger.info('Signing up new user...');

            const response = await fetch(`${this.baseUrl}/api/auth/sign-up/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Sign up failed: ${response.statusText}`);
            }

            const responseData = await response.json() as { user?: { id: string; email: string } };
            const sessionToken = this.extractSessionTokenFromHeaders(response);

            if (!sessionToken || !responseData.user) {
                throw new Error('Invalid response from server');
            }

            const authResponse: AuthResponse = {
                sessionToken,
                userId: responseData.user.id,
                email: responseData.user.email,
            };

            // Set session token on the client instance
            this.setSessionToken(sessionToken);

            this.logger.info('Sign up successful');
            return authResponse;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Sign up error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Sign in an existing user
     * @param data User credentials
     * @returns Authentication response with session token
     */
    async signIn(data: SignInData): Promise<AuthResponse> {
        try {
            this.logger.info('Signing in...');

            const response = await fetch(`${this.baseUrl}/api/auth/sign-in/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Sign in failed: ${response.statusText}`);
            }

            const responseData = await response.json() as { user?: { id: string; email: string } };
            const sessionToken = this.extractSessionTokenFromHeaders(response);

            if (!sessionToken || !responseData.user) {
                throw new Error('Invalid response from server');
            }

            const authResponse: AuthResponse = {
                sessionToken,
                userId: responseData.user.id,
                email: responseData.user.email,
            };

            // Set session token on the client instance
            this.setSessionToken(sessionToken);

            this.logger.info('Sign in successful');
            return authResponse;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Sign in error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Sign out current user
     * Clears local session token regardless of server response
     */
    async signOut(): Promise<void> {
        this.logger.info('Signing out...');

        const sessionToken = this.getSessionToken();
        try {
            // Attempt to notify server, but don't fail if it doesn't work
            await fetch(`${this.baseUrl}/api/auth/sign-out`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(sessionToken && {
                        'Cookie': `better-auth.session_token=${sessionToken}`,
                    }),
                },
            });
        } catch {
            // Ignore network errors - we still want to clear local token
        }

        this.clearSessionToken();
        this.logger.info('Sign out successful');
    }
}

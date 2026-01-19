import type { ILogger } from '@platform/platform-domain';
import { PlatformApiClient, type AuthResponse } from '@platform/sdk';
import * as p from '@clack/prompts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface AuthManagerConfig {
    baseUrl: string;
    logger: ILogger;
}

/**
 * CLI-specific Authentication Manager
 * Handles session storage in file system and terminal prompts
 */
export class AuthManager {
    private apiClient: PlatformApiClient;
    private logger: ILogger;
    private sessionFilePath: string;
    private baseUrl: string;

    constructor(config: AuthManagerConfig) {
        this.logger = config.logger;
        this.baseUrl = config.baseUrl;
        this.apiClient = new PlatformApiClient({
            baseUrl: config.baseUrl,
            logger: config.logger,
        });

        // Store session in user's home directory
        const homeDir = os.homedir();
        const configDir = path.join(homeDir, '.platform-cli');
        this.sessionFilePath = path.join(configDir, 'session.json');

        // Ensure config directory exists
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
    }

    /**
     * Authenticate user with email and password
     * Checks for existing session first, validates it, then prompts if needed
     */
    async login(): Promise<AuthResponse | null> {
        try {
            // Check if session already exists
            const existingSession = this.loadSession();
            if (existingSession) {
                // Validate session is still valid by making a test request
                const isValid = await this.validateSession(existingSession.sessionToken);
                if (isValid) {
                    this.logger.info('Using existing session');
                    return existingSession;
                }
                // Session expired, clear it
                this.logger.info('Session expired, please sign in again');
                this.clearSession();
            }

            // Prompt for credentials using clack prompts
            const email = await p.text({
                message: 'Email',
                placeholder: 'your@email.com',
                validate: (value) => {
                    if (!value) return 'Email is required';
                    if (!value.includes('@')) return 'Invalid email';
                },
            });

            if (p.isCancel(email)) {
                return null;
            }

            const password = await p.password({
                message: 'Password',
                validate: (value) => {
                    if (!value) return 'Password is required';
                },
            });

            if (p.isCancel(password)) {
                return null;
            }

            // Call API to sign in
            const authResponse = await this.apiClient.auth.signIn({
                email: email as string,
                password: password as string
            });

            // Save session to file
            this.saveSession(authResponse);

            return authResponse;

        } catch (error) {
            this.logger.error(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }
    }

    /**
     * Sign up a new user
     */
    async signUp(name: string, email: string, password: string): Promise<AuthResponse | null> {
        try {
            const authResponse = await this.apiClient.auth.signUp({ email, password, name });

            // Save session to file
            this.saveSession(authResponse);

            return authResponse;

        } catch (error) {
            this.logger.error(`Sign up error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }
    }

    /**
     * Clear stored session and sign out from API
     */
    async logout(): Promise<void> {
        try {
            // Load current session to set token for API call
            const session = this.loadSession();
            if (session) {
                this.apiClient.setSessionToken(session.sessionToken);
                await this.apiClient.auth.signOut();
            }

            // Clear local session file
            this.clearSession();
            this.logger.info('Logged out successfully');

        } catch (error) {
            this.logger.error(`Error logging out: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // Still clear local session even if API call fails
            this.clearSession();
        }
    }

    /**
     * Get current session if it exists
     */
    getCurrentSession(): AuthResponse | null {
        return this.loadSession();
    }

    /**
     * Validate session token by making a test request to the API
     */
    private async validateSession(sessionToken: string): Promise<boolean> {
        try {
            // Create a temporary client with the session token
            const testClient = new PlatformApiClient({
                baseUrl: this.baseUrl,
                sessionToken,
                logger: this.logger,
            });
            // Try to fetch config - this requires authentication
            await testClient.config.fetchAll();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Load session from file
     */
    private loadSession(): AuthResponse | null {
        try {
            if (fs.existsSync(this.sessionFilePath)) {
                const data = fs.readFileSync(this.sessionFilePath, 'utf-8');
                return JSON.parse(data) as AuthResponse;
            }
        } catch (error) {
            // Session file might be corrupted, ignore
            this.logger.debug('Could not load session file');
        }
        return null;
    }

    /**
     * Save session to file
     */
    private saveSession(credentials: AuthResponse): void {
        fs.writeFileSync(this.sessionFilePath, JSON.stringify(credentials, null, 2));
    }

    /**
     * Clear session file
     */
    private clearSession(): void {
        try {
            if (fs.existsSync(this.sessionFilePath)) {
                fs.unlinkSync(this.sessionFilePath);
            }
        } catch (error) {
            this.logger.debug('Could not clear session file');
        }
    }
}

import type { ILogger } from '@platform/domain';
import { PlatformApiClient, type AuthResponse } from '@platform/sdk';
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

    constructor(config: AuthManagerConfig) {
        this.logger = config.logger;
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
     * Checks for existing session first, then prompts if needed
     */
    async login(): Promise<AuthResponse | null> {
        try {
            // Check if session already exists
            const existingSession = this.loadSession();
            if (existingSession) {
                this.logger.info('Using existing session');
                return existingSession;
            }

            // Prompt for credentials
            this.logger.info('Please enter your credentials:');

            const email = await this.promptForInput('Email: ');
            const password = await this.promptForInput('Password: ', true);

            // Call API to sign in
            const authResponse = await this.apiClient.signIn({ email, password });

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
            const authResponse = await this.apiClient.signUp({ email, password, name });

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
                await this.apiClient.signOut();
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

    /**
     * Prompt user for input in terminal
     */
    private async promptForInput(prompt: string, hidden = false): Promise<string> {
        process.stdout.write(prompt);

        return new Promise((resolve) => {
            const { stdin } = process;
            stdin.setRawMode(true);
            stdin.resume();
            stdin.setEncoding('utf8');

            let input = '';

            const onData = (key: string) => {
                if (key === '\u0003') {
                    // Ctrl+C
                    process.exit();
                } else if (key === '\r' || key === '\n') {
                    // Enter
                    stdin.setRawMode(false);
                    stdin.pause();
                    stdin.removeListener('data', onData);
                    process.stdout.write('\n');
                    resolve(input);
                } else if (key === '\u007F') {
                    // Backspace
                    if (input.length > 0) {
                        input = input.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                } else {
                    input += key;
                    process.stdout.write(hidden ? '*' : key);
                }
            };

            stdin.on('data', onData);
        });
    }
}

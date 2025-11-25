import type { IAuth, AuthCredentials } from '../ports/IAuth.js';
import type { ILogger } from '../ports/ILogger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface AuthConfig {
    baseUrl: string;
    logger: ILogger;
}

/**
 * Authentication adapter
 * Handles user authentication with the platform API
 */
export class Auth implements IAuth {
    private baseUrl: string;
    private logger: ILogger;
    private sessionFilePath: string;

    constructor(config: AuthConfig) {
        this.baseUrl = config.baseUrl;
        this.logger = config.logger;

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
     * Prompts user for credentials and makes API call
     */
    async login(): Promise<AuthCredentials | null> {
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

            // Make API call to authenticate
            const response = await fetch(`${this.baseUrl}/api/auth/sign-in/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                this.logger.error(`Authentication failed: ${response.statusText}`);
                return null;
            }

            const data = await response.json() as { user?: { id: string; email: string } };

            // Extract session token from cookie or response
            const sessionToken = this.extractSessionToken(response);

            if (!sessionToken || !data.user) {
                this.logger.error('Invalid response from server');
                return null;
            }

            const credentials: AuthCredentials = {
                sessionToken,
                userId: data.user.id,
                email: data.user.email,
            };

            // Save session to file
            this.saveSession(credentials);

            this.logger.success('Authentication successful!');
            return credentials;

        } catch (error) {
            this.logger.error(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }
    }

    /**
     * Clear stored session
     */
    async logout(): Promise<void> {
        try {
            if (fs.existsSync(this.sessionFilePath)) {
                fs.unlinkSync(this.sessionFilePath);
                this.logger.info('Session cleared');
            }
        } catch (error) {
            this.logger.error(`Error clearing session: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Load session from file
     */
    private loadSession(): AuthCredentials | null {
        try {
            if (fs.existsSync(this.sessionFilePath)) {
                const data = fs.readFileSync(this.sessionFilePath, 'utf-8');
                return JSON.parse(data);
            }
        } catch (error) {
            // Session file might be corrupted, ignore
        }
        return null;
    }

    /**
     * Save session to file
     */
    private saveSession(credentials: AuthCredentials): void {
        fs.writeFileSync(this.sessionFilePath, JSON.stringify(credentials, null, 2));
    }

    /**
     * Extract session token from response headers
     */
    private extractSessionToken(response: Response): string | null {
        const setCookie = response.headers.get('set-cookie');
        if (!setCookie) return null;

        // Parse session token from better-auth cookie
        const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
        return match ? match[1] : null;
    }

    /**
     * Prompt user for input (helper for CLI interaction)
     */
    private async promptForInput(prompt: string, hidden = false): Promise<string> {
        // For now, this is a placeholder. In the actual CLI, we'll use @clack/prompts
        // This will be mocked in tests
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

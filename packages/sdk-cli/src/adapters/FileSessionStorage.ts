import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { ISessionStorage } from '@abeauvois/platform-sdk';

/**
 * Stored session data structure
 */
export interface StoredSession {
    sessionToken: string;
    userId?: string;
    email?: string;
}

/**
 * File-based session storage for CLI applications.
 * Stores session data in ~/.platform-cli/session.json by default.
 */
export class FileSessionStorage implements ISessionStorage {
    private readonly filePath: string;
    private readonly configDir: string;

    /**
     * @param configDirName - Name of the config directory in user's home (default: '.platform-cli')
     */
    constructor(configDirName = '.platform-cli') {
        const homeDir = os.homedir();
        this.configDir = path.join(homeDir, configDirName);
        this.filePath = path.join(this.configDir, 'session.json');

        // Ensure config directory exists
        this.ensureConfigDir();
    }

    async getToken(): Promise<string | null> {
        const session = this.loadSession();
        return session?.sessionToken ?? null;
    }

    async setToken(token: string): Promise<void> {
        const existingSession = this.loadSession();
        const session: StoredSession = {
            ...existingSession,
            sessionToken: token,
        };
        this.saveSession(session);
    }

    async clearToken(): Promise<void> {
        try {
            if (fs.existsSync(this.filePath)) {
                fs.unlinkSync(this.filePath);
            }
        } catch {
            // Ignore errors when clearing
        }
    }

    async hasSession(): Promise<boolean> {
        return (await this.getToken()) !== null;
    }

    /**
     * Get full session data including userId and email
     */
    getFullSession(): StoredSession | null {
        return this.loadSession();
    }

    /**
     * Save full session data including userId and email
     */
    saveFullSession(session: StoredSession): void {
        this.saveSession(session);
    }

    /**
     * Get the path to the session file
     */
    getSessionFilePath(): string {
        return this.filePath;
    }

    private ensureConfigDir(): void {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    private loadSession(): StoredSession | null {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf-8');
                return JSON.parse(data) as StoredSession;
            }
        } catch {
            // Session file might be corrupted, ignore
        }
        return null;
    }

    private saveSession(session: StoredSession): void {
        this.ensureConfigDir();
        fs.writeFileSync(this.filePath, JSON.stringify(session, null, 2));
    }
}

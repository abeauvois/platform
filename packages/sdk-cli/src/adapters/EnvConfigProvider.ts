import type { IConfigProvider } from '@platform/platform-domain';

/**
 * Configuration provider that loads from .env files.
 * Uses Bun runtime APIs for file access.
 *
 * Note: This provider is CLI/server-specific and requires Bun runtime.
 * For web applications, use ApiConfigProvider from @platform/sdk instead.
 */
export class EnvConfigProvider implements IConfigProvider {
    private config: Map<string, string> = new Map();

    async load(envPath: string = '.env'): Promise<void> {
        try {
            const file = Bun.file(envPath);

            if (!(await file.exists())) {
                throw new Error(`.env file not found at: ${envPath}`);
            }

            const content = await file.text();
            const lines = content.split('\n');

            for (const line of lines) {
                // Skip empty lines and comments
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) {
                    continue;
                }

                // Parse KEY=VALUE format
                const equalsIndex = trimmed.indexOf('=');
                if (equalsIndex === -1) {
                    continue;
                }

                const key = trimmed.substring(0, equalsIndex).trim();
                const value = trimmed
                    .substring(equalsIndex + 1)
                    .trim()
                    .replace(/^["']|["']$/g, ''); // Remove surrounding quotes

                this.config.set(key, value);
            }
        } catch (error) {
            throw new Error(
                `Failed to load .env file: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    get(key: string): string {
        const value = this.config.get(key);
        if (value === undefined) {
            throw new Error(`Configuration key not found: ${key}`);
        }
        return value;
    }

    getOptional(key: string, defaultValue: string = ''): string {
        return this.config.get(key) ?? defaultValue;
    }

    has(key: string): boolean {
        return this.config.has(key);
    }
}

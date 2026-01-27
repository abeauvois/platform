/**
 * CLI Configuration for E2E Testing
 * 
 * This configuration file is used for both:
 * - CLI E2E tests
 * - Integration tests that need consistent configuration
 * 
 * It provides Gmail credentials, output paths, and default settings.
 */

export interface CliConfig {
    gmail: {
        clientId: string;
        clientSecret: string;
        refreshToken: string;
        filterEmail?: string;
    };
    anthropic: {
        apiKey: string;
        model: string;
    };
    output: {
        csvPath: string;
        timestampFile: string;
    };
    lastRun: {
        // Set to 4 days ago for testing
        daysAgo: number;
    };
}

/**
 * Load configuration from environment variables
 * This allows tests to use either .env or explicit config
 */
export async function loadCliConfig(): Promise<CliConfig> {
    const { EnvConfigProvider } = await import('@abeauvois/platform-sdk');
    const configProvider = new EnvConfigProvider();

    // Resolve .env path relative to this config file (project root)
    const envPath = new URL('.env', import.meta.url).pathname;
    await configProvider.load(envPath);

    return {
        gmail: {
            clientId: configProvider.getOptional('GMAIL_CLIENT_ID'),
            clientSecret: configProvider.getOptional('GMAIL_CLIENT_SECRET'),
            refreshToken: configProvider.getOptional('GMAIL_REFRESH_TOKEN'),
            filterEmail: configProvider.getOptional('MY_EMAIL_ADDRESS'),
        },
        anthropic: {
            apiKey: configProvider.getOptional('ANTHROPIC_API_KEY'),
            model: 'claude-3-5-haiku-20241022',
        },
        output: {
            csvPath: './data/gmail-bookmarks.csv',
            timestampFile: '.gmail-cli-last-run',
        },
        lastRun: {
            daysAgo: 4, // Default to 4 days ago for testing
        },
    };
}

/**
 * Validate configuration has all required fields
 */
export function validateCliConfig(config: CliConfig): void {
    const missing: string[] = [];

    if (!config.gmail.clientId) missing.push('GMAIL_CLIENT_ID');
    if (!config.gmail.clientSecret) missing.push('GMAIL_CLIENT_SECRET');
    if (!config.gmail.refreshToken) missing.push('GMAIL_REFRESH_TOKEN');
    if (!config.anthropic.apiKey) missing.push('ANTHROPIC_API_KEY');

    if (missing.length > 0) {
        throw new Error(
            `Missing required configuration: ${missing.join(', ')}\n` +
            'Please ensure these are set in your .env file.'
        );
    }

    // Check for placeholder values
    if (
        config.gmail.clientId === 'your_gmail_client_id_here' ||
        config.gmail.clientSecret === 'your_gmail_client_secret_here' ||
        config.gmail.refreshToken === 'your_gmail_refresh_token_here' ||
        config.anthropic.apiKey === 'your_anthropic_api_key_here'
    ) {
        throw new Error(
            'Configuration contains placeholder values.\n' +
            'Please replace them with real credentials in your .env file.'
        );
    }
}

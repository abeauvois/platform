import * as p from '@clack/prompts';
import { FetchRecentGmailsUseCase } from '../../application/FetchRecentGmailsUseCase.js';
import { GoogleGmailClient } from '../../infrastructure/adapters/GoogleGmailClient.js';
import { FileTimestampRepository } from '../../infrastructure/repositories/FileTimestampRepository.js';
import { CliuiLogger } from '../../infrastructure/adapters/CliuiLogger.js';
import { EnvConfig } from '../../infrastructure/config/EnvConfig.js';
import { GmailMessage } from '../../domain/entities/GmailMessage.js';

/**
 * Gmail command - Fetch recent Gmail messages
 * Shows emails received since last execution
 */
export async function gmailCommand() {
    p.intro('📧 Gmail Recent Messages');

    try {
        // Load Gmail credentials from .env
        const config = new EnvConfig();
        await config.load();

        const { clientId, clientSecret, refreshToken } = checkConfig(config);

        // Get optional filter email from env
        const filterEmail = config.get('MY_EMAIL_ADDRESS');

        const spinner = p.spinner();
        spinner.start('Fetching recent Gmail messages...');

        // Initialize dependencies
        const logger = new CliuiLogger();
        const gmailClient = new GoogleGmailClient(clientId, clientSecret, refreshToken, logger);
        const timestampRepo = new FileTimestampRepository('.gmail-last-run');

        // Create workflow service
        const { GmailFetchWorkflowService } = await import('../../application/services/GmailFetchWorkflowService.js');
        const workflowService = new GmailFetchWorkflowService(gmailClient, timestampRepo, logger, filterEmail);

        // Execute use case with workflow service
        const useCase = new FetchRecentGmailsUseCase(workflowService);
        const messages = await useCase.execute();

        spinner.stop(`Found ${messages.length} new message${messages.length === 1 ? '' : 's'}`);

        OnSuccessDisplay(messages);

    } catch (error) {
        p.log.error(`Failed to fetch Gmail messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
        p.outro('❌ Gmail check failed');
        process.exit(1);
    }
}
function checkConfig(config: EnvConfig) {
    const clientId = config.get('GMAIL_CLIENT_ID');
    const clientSecret = config.get('GMAIL_CLIENT_SECRET');
    const refreshToken = config.get('GMAIL_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !refreshToken) {
        p.log.error('Gmail credentials not found in .env file');
        p.note(
            `Please add the following to your .env file:

GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token

To get these credentials:
1. Go to Google Cloud Console (https://console.cloud.google.com)
2. Create a project and enable Gmail API
3. Create OAuth 2.0 credentials
4. Generate a refresh token using OAuth playground`,
            'Missing Gmail Credentials'
        );
        p.outro('❌ Configuration incomplete');
        process.exit(1);
    }
    return { clientId, clientSecret, refreshToken };
}

function OnSuccessDisplay(messages: GmailMessage[]) {
    if (messages.length === 0) {
        p.log.info('No new messages since last check');
    } else {
        // Display messages
        console.log('\n📬 Recent Messages:\n');

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            const receivedDate = msg.receivedAt.toLocaleString();

            console.log(`${i + 1}. 📩 ${msg.subject}`);
            console.log(`   From: ${msg.from}`);
            console.log(`   Received: ${receivedDate}`);
            if (msg.snippet) {
                console.log(`   Preview: ${msg.snippet.substring(0, 100)}...`);
            }
            if (i < messages.length - 1) {
                console.log('');
            }
        }
    }

    p.outro('✨ Gmail check complete!');
}

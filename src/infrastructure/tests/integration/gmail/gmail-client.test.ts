import { test, expect, describe } from 'bun:test';
import { join } from 'node:path';
import { GmailClient } from '../../../adapters/GmailClient.js';
import { CliuiLogger } from '../../../adapters/CliuiLogger.js';
import { EnvConfigProvider } from '@platform/sdk';

/**
 * Integration Test: Gmail Credentials & API Connection
 *
 * Tests real Gmail API connectivity with credentials from .env file.
 *
 * Prerequisites:
 * - GMAIL_CLIENT_ID in .env
 * - GMAIL_CLIENT_SECRET in .env
 * - GMAIL_REFRESH_TOKEN in .env
 * - MY_EMAIL_ADDRESS in .env
 *
 * This test will be skipped if credentials are not configured.
 */

const envPath = join(import.meta.dir, '../../.env')

describe('Gmail API Integration', () => {
    test('should authenticate and fetch messages with valid credentials', async () => {
        // Load credentials from .env
        const config = new EnvConfigProvider();
        await config.load(envPath);

        const clientId = config.getOptional('GMAIL_CLIENT_ID');
        const clientSecret = config.getOptional('GMAIL_CLIENT_SECRET');
        const refreshToken = config.getOptional('GMAIL_REFRESH_TOKEN');
        const filterEmail = config.getOptional('MY_EMAIL_ADDRESS');

        // Skip test if credentials are not configured
        if (!clientId || !clientSecret || !refreshToken) {
            console.log('⏭️  Skipping Gmail integration test: Credentials not found in .env');
            throw new Error("missing GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN to run this test");
        }

        // Skip if using placeholder values
        if (
            clientId === 'your_gmail_client_id_here' ||
            clientSecret === 'your_gmail_client_secret_here' ||
            refreshToken === 'your_gmail_refresh_token_here'
        ) {
            console.log('⏭️  Skipping Gmail integration test: Placeholder credentials detected');
            console.log('   Replace placeholder values with real Gmail credentials');
            throw new Error("Placeholder should replaced: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN to run this test");
        }

        console.log('✅ Gmail credentials found, testing API connection...');

        // Initialize Gmail client with real credentials
        const logger = new CliuiLogger();
        const gmailClient = new GmailClient(clientId, clientSecret, refreshToken, logger);

        // Test: Fetch messages from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);


        let messages;
        try {
            messages = await gmailClient.fetchMessagesSince(sevenDaysAgo, filterEmail);
        } catch (error) {
            // Provide helpful error messages
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (errorMessage.includes('invalid_grant')) {
                throw new Error(
                    'Gmail authentication failed: invalid_grant\n' +
                    'Possible causes:\n' +
                    '  - Refresh token expired or revoked\n' +
                    '  - OAuth consent screen not configured correctly\n' +
                    '  - App is in "Testing" mode (add yourself as test user)\n' +
                    'Solution: Generate a new refresh token using OAuth playground'
                );
            }

            if (errorMessage.includes('invalid_client')) {
                throw new Error(
                    'Gmail authentication failed: invalid_client\n' +
                    'Possible causes:\n' +
                    '  - Invalid client ID or client secret\n' +
                    '  - Credentials from wrong project\n' +
                    'Solution: Verify credentials in Google Cloud Console'
                );
            }

            throw new Error(`Gmail API error: ${errorMessage}`);
        }

        // Assertions
        expect(messages).toBeDefined();
        expect(Array.isArray(messages)).toBe(true);

        console.log(`✅ Successfully fetched ${messages.length} message(s) from last 7 days`);

        // If messages were returned, validate structure
        if (messages.length > 0) {
            const firstMessage = messages[0];

            expect(firstMessage.id).toBeDefined();
            expect(typeof firstMessage.id).toBe('string');

            expect(firstMessage.subject).toBeDefined();
            expect(typeof firstMessage.subject).toBe('string');

            expect(firstMessage.from).toBeDefined();
            expect(typeof firstMessage.from).toBe('string');

            expect(firstMessage.receivedAt).toBeInstanceOf(Date);

            expect(firstMessage.snippet).toBeDefined();
            expect(typeof firstMessage.snippet).toBe('string');

            console.log('✅ Message structure validated');
            console.log(`   Sample: "${firstMessage.subject}" from ${firstMessage.from}`);
        } else {
            console.log('ℹ️  No messages found in last 7 days (this is okay for testing)');
        }
    }, 30000); // 30 second timeout for API call

    test('should handle authentication errors gracefully', async () => {
        const logger = new CliuiLogger();

        // Create client with invalid credentials
        const invalidClient = new GmailClient(
            'invalid_client_id',
            'invalid_client_secret',
            'invalid_refresh_token',
            logger
        );

        // Should throw error when attempting to fetch
        await expect(
            invalidClient.fetchMessagesSince(new Date())
        ).rejects.toThrow();

        console.log('✅ Invalid credentials properly rejected');
    }, 30000);
});

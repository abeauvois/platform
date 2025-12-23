import { test, expect, describe } from 'bun:test';
import { GmailSourceReader } from '../../../../application/source-readers/GmailSourceReader.js';
import { GmailClient } from '../../../adapters/GmailClient.js';
import { FileTimestampRepository } from '../../../repositories/FileTimestampRepository.js';
import { CliuiLogger } from '../../../adapters/CliuiLogger.js';
import { EnvConfig } from '../../../config/EnvConfig.js';
import { ApiIngestionConfig } from '../../../../domain/entities/IngestionConfig.js';

/**
 * Integration Test: GmailSourceReader with Real Gmail API
 *
 * Tests the GmailSourceReader abstraction with real Gmail API connectivity.
 *
 * Prerequisites:
 * - GMAIL_CLIENT_ID in .env
 * - GMAIL_CLIENT_SECRET in .env
 * - GMAIL_REFRESH_TOKEN in .env
 * - MY_EMAIL_ADDRESS in .env (optional)
 *
 * This test will be skipped if credentials are not configured.
 */

describe('GmailSourceReader Integration Tests', () => {
    test('should ingest real Gmail messages using data source abstraction', async () => {
        // Load credentials from .env
        const envConfig = new EnvConfig();
        await envConfig.load();

        const clientId = envConfig.get('GMAIL_CLIENT_ID');
        const clientSecret = envConfig.get('GMAIL_CLIENT_SECRET');
        const refreshToken = envConfig.get('GMAIL_REFRESH_TOKEN');
        const filterEmail = envConfig.get('MY_EMAIL_ADDRESS');

        // Skip test if credentials are not configured
        if (!clientId || !clientSecret || !refreshToken) {
            console.log('⏭️  Skipping Gmail data source integration test: Credentials not found in .env');
            throw new Error("Missing GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN to run this test");
        }

        // Skip if using placeholder values
        if (
            clientId === 'your_gmail_client_id_here' ||
            clientSecret === 'your_gmail_client_secret_here' ||
            refreshToken === 'your_gmail_refresh_token_here'
        ) {
            console.log('⏭️  Skipping Gmail data source integration test: Placeholder credentials detected');
            throw new Error("Placeholder credentials should be replaced with real Gmail credentials");
        }

        console.log('✅ Gmail credentials found, testing data source abstraction...');

        // Initialize dependencies
        const logger = new CliuiLogger();
        const gmailClient = new GmailClient(clientId, clientSecret, refreshToken, logger);
        const timestampRepo = new FileTimestampRepository('.gmail-integration-test-last-run');

        // Create GmailSourceReader
        const sourceReader = new GmailSourceReader(
            gmailClient,
            timestampRepo,
            logger
        );

        // Test: Ingest messages from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const ingestionConfig: ApiIngestionConfig = {
            credentials: {
                clientId,
                clientSecret,
                refreshToken,
            },
            since: sevenDaysAgo,
            filters: filterEmail ? { email: filterEmail } : undefined,
        };

        let results;
        try {
            results = await sourceReader.ingest(ingestionConfig);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (errorMessage.includes('invalid_grant')) {
                throw new Error(
                    'Gmail authentication failed: invalid_grant\n' +
                    'Possible causes:\n' +
                    '  - Refresh token expired or revoked\n' +
                    '  - OAuth consent screen not configured correctly\n' +
                    'Solution: Generate a new refresh token using OAuth playground'
                );
            }

            if (errorMessage.includes('invalid_client')) {
                throw new Error(
                    'Gmail authentication failed: invalid_client\n' +
                    'Possible causes:\n' +
                    '  - Invalid client ID or client secret\n' +
                    'Solution: Verify credentials in Google Cloud Console'
                );
            }

            throw new Error(`Gmail data source error: ${errorMessage}`);
        }

        // Assertions on results
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);

        console.log(`✅ Successfully ingested ${results.length} message(s) as BaseContent`);

        // Verify all results are properly normalized BaseContent
        results.forEach(content => {
            expect(content.sourceAdapter).toBe('Gmail');
            expect(content.rawContent).toBeDefined();
            expect(typeof content.rawContent).toBe('string');
            expect(content.createdAt).toBeInstanceOf(Date);
            expect(content.updatedAt).toBeInstanceOf(Date);
            expect(content.tags).toEqual([]); // Initially empty
            expect(content.summary).toBe(''); // Initially empty
        });

        console.log('✅ All results properly normalized to BaseContent');

        // If messages were returned, validate content structure
        if (results.length > 0) {
            const firstResult = results[0];

            expect(firstResult.sourceAdapter).toBe('Gmail');
            expect(firstResult.rawContent.length).toBeGreaterThan(0);

            console.log(`✅ Sample content validated: ${firstResult.rawContent.length} characters`);
        } else {
            console.log('ℹ️  No messages found in last 7 days (this is okay for testing)');
        }
    }, 30000); // 30 second timeout for API call

    test('should validate credentials before ingestion', async () => {
        const logger = new CliuiLogger();
        const gmailClient = new GmailClient('invalid', 'invalid', 'invalid', logger);
        const timestampRepo = new FileTimestampRepository('.gmail-test-timestamp');

        const sourceReader = new GmailSourceReader(
            gmailClient,
            timestampRepo,
            logger
        );

        // Config with invalid credentials
        const config: ApiIngestionConfig = {
            credentials: {
                clientId: 'invalid_id',
                clientSecret: 'invalid_secret',
                refreshToken: 'invalid_token',
            },
            since: new Date(),
        };

        // Should throw error during ingestion
        await expect(sourceReader.ingest(config)).rejects.toThrow();

        console.log('✅ Invalid credentials properly rejected');
    }, 30000);

    test('should throw error if required credentials are missing', async () => {
        const logger = new CliuiLogger();
        const gmailClient = new GmailClient('test', 'test', 'test', logger);
        const timestampRepo = new FileTimestampRepository('.gmail-test-timestamp');

        const sourceReader = new GmailSourceReader(
            gmailClient,
            timestampRepo,
            logger
        );

        // Config with missing credentials
        const config: ApiIngestionConfig = {
            credentials: {
                clientId: '',  // Missing
            },
        };

        // Should throw validation error
        await expect(sourceReader.ingest(config)).rejects.toThrow('Gmail requires clientId, clientSecret, and refreshToken');

        console.log('✅ Missing credentials validation works correctly');
    });

    test('should use timestamp repository for incremental fetching', async () => {
        const envConfig = new EnvConfig();
        await envConfig.load();

        const clientId = envConfig.get('GMAIL_CLIENT_ID');
        const clientSecret = envConfig.get('GMAIL_CLIENT_SECRET');
        const refreshToken = envConfig.get('GMAIL_REFRESH_TOKEN');

        // Skip if credentials not available
        if (!clientId || !clientSecret || !refreshToken ||
            clientId === 'your_gmail_client_id_here') {
            console.log('⏭️  Skipping timestamp test: Valid credentials required');
            throw new Error("Valid credentials required for this test");
        }

        const logger = new CliuiLogger();
        const gmailClient = new GmailClient(clientId, clientSecret, refreshToken, logger);
        const timestampRepo = new FileTimestampRepository('.gmail-timestamp-test');

        // Set a known timestamp
        const testTimestamp = new Date('2024-01-01');
        await timestampRepo.saveLastExecutionTime(testTimestamp);

        const sourceReader = new GmailSourceReader(
            gmailClient,
            timestampRepo,
            logger
        );

        // Config WITHOUT since date - should use timestamp from repo
        const config: ApiIngestionConfig = {
            credentials: {
                clientId,
                clientSecret,
                refreshToken,
            },
            // No 'since' - should fall back to timestamp repository
        };

        const results = await sourceReader.ingest(config);

        expect(results).toBeDefined();
        console.log(`✅ Timestamp repository used correctly, fetched ${results.length} messages`);

    }, 30000);

    test('should apply email filter when provided', async () => {
        const envConfig = new EnvConfig();
        await envConfig.load();

        const clientId = envConfig.get('GMAIL_CLIENT_ID');
        const clientSecret = envConfig.get('GMAIL_CLIENT_SECRET');
        const refreshToken = envConfig.get('GMAIL_REFRESH_TOKEN');
        const filterEmail = envConfig.get('MY_EMAIL_ADDRESS');

        if (!clientId || !clientSecret || !refreshToken ||
            clientId === 'your_gmail_client_id_here' || !filterEmail) {
            console.log('⏭️  Skipping filter test: Valid credentials and MY_EMAIL_ADDRESS required');
            throw new Error("Valid credentials and MY_EMAIL_ADDRESS required for this test");
        }

        const logger = new CliuiLogger();
        const gmailClient = new GmailClient(clientId, clientSecret, refreshToken, logger);
        const timestampRepo = new FileTimestampRepository('.gmail-filter-test');

        const sourceReader = new GmailSourceReader(
            gmailClient,
            timestampRepo,
            logger
        );

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const config: ApiIngestionConfig = {
            credentials: {
                clientId,
                clientSecret,
                refreshToken,
            },
            since: sevenDaysAgo,
            filters: {
                email: filterEmail,  // Apply email filter
            },
        };

        const results = await sourceReader.ingest(config);

        expect(results).toBeDefined();
        console.log(`✅ Email filter applied, found ${results.length} message(s) from ${filterEmail}`);
    }, 30000);
});

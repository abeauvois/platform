import { command } from 'cleye';
import { AuthManager } from '../lib/AuthManager.js';
import { CliuiLogger } from '../lib/CliuiLogger.js';
import { PlatformApiClient } from '@platform/sdk';

/**
 * List command - Fetch bookmarks from the platform API
 * 
 * Usage:
 *   cli personal bookmark list
 */
export const listCommand = command({
    name: 'list',
    help: {
        description: 'List bookmarks from the platform API',
    },
}, async (argv) => {
    try {
        console.log('🚀 Personal Bookmark Listing\n');

        const baseUrl = process.env.PLATFORM_API_URL || 'http://localhost:3000';
        const logger = new CliuiLogger();

        // Authenticate
        const authManager = new AuthManager({ baseUrl, logger });
        const credentials = await authManager.login();

        if (!credentials) {
            logger.error('Authentication failed. Please check your credentials and try again.');
            process.exit(1);
        }

        // Create authenticated API client
        const apiClient = new PlatformApiClient({
            baseUrl,
            sessionToken: credentials.sessionToken,
            logger,
        });

        // Fetch bookmarks
        logger.info('Fetching bookmarks from API...\n');
        const bookmarks = await apiClient.fetchBookmarks();

        if (bookmarks.length === 0) {
            logger.info('No bookmarks found.');
            logger.info('✨ All done!\n');
            return;
        }

        // Display bookmarks
        logger.success(`\nFound ${bookmarks.length} bookmarks:\n`);
        console.table(bookmarks.map(b => ({
            url: b.url,
            tags: b.tags.join(', '),
            summary: b.summary?.substring(0, 50) || 'N/A',
            source: b.sourceAdapter,
        })));

        logger.info('\n✨ All done!\n');

    } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
        if (error instanceof Error && error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        process.exit(1);
    }
});

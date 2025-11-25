import { command } from 'cleye';
import { loadCliConfig, validateCliConfig } from '../../../config.cli.js';

/**
 * List command - Fetch bookmarks from various sources
 * 
 * Usage:
 *   cli personal bookmark list -f gmail
 *   cli personal bookmark list --from gmail
 */
export const listCommand = command({
    name: 'list',
    flags: {
        from: {
            type: String,
            description: 'Source to get bookmarks from (gmail, notion, repository, etc.)',
            alias: 'f',
        },

    },
    help: {
        description: 'Ingest bookmarks from various sources',
    },
}, async (argv) => {
    try {
        const source = argv.flags.from;

        if (!source) {
            console.error('❌ Error: --from flag is required');
            console.error('Usage: cli personal bookmark ingest -f gmail -t csv\n');
            process.exit(1);
        }

        // Currently only support gmail -> csv
        if (source !== 'gmail') {
            console.error(`❌ Error: Source '${source}' is not supported yet`);
            console.error('Supported sources: gmail\n');
            process.exit(1);
        }

        console.log('🚀 Personal Bookmark Listing\n');
        console.log(`📥 Source: ${source}`);
        console.log(`\n`);

        // Import dependencies
        const { CliuiLogger, Auth, Fetcher } = await import('@platform/sdk');

        // initialize platform sdk
        const logger = new CliuiLogger();
        const auth = new Auth({
            baseUrl: process.env.PLATFORM_API_URL || 'http://localhost:3000',
            logger
        });
        const credentials = await auth.login();

        if (!credentials) {
            logger.error('❌ Error: Authentication failed. Please check your credentials and try again.');
            process.exit(1);
        }

        // Execute workflow
        logger.info('🔄 Fetching bookmarks from API...\n');
        const fetcher = new Fetcher({
            baseUrl: process.env.PLATFORM_API_URL || 'http://localhost:3000',
            credentials,
            logger
        });
        const bookmarks = await fetcher.fetchBookmarks();

        if (bookmarks.length === 0) {
            logger.info('ℹ️  No bookmarks found.');
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

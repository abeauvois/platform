import type { ILogger } from '@abeauvois/platform-core';
import { BaseContent, InMemoryTimestampRepository, type ISourceReader, type SourceReaderConfig } from '@abeauvois/platform-ingestion';
import { DrizzleBookmarkRepository } from '../DrizzleBookmarkRepository';

// Singleton timestamp repository to persist state across jobs
const bookmarkTimestampRepo = new InMemoryTimestampRepository('bookmark');

/**
 * Create a Bookmark source reader that fetches bookmarks from the database
 */
export function createBookmarkSourceReader(logger: ILogger): ISourceReader | undefined {
    const repository = new DrizzleBookmarkRepository();

    return {
        async read(config: SourceReaderConfig): Promise<Array<BaseContent>> {
            logger.info('Fetching bookmarks from database...');

            // Calculate since timestamp
            let sinceDate: Date;
            const lastExecution = await bookmarkTimestampRepo.getLastExecutionTime();

            if (config.filter?.limitDays) {
                sinceDate = new Date(Date.now() - config.filter.limitDays * 24 * 60 * 60 * 1000);
            } else if (lastExecution) {
                sinceDate = lastExecution;
            } else {
                // Default: last 30 days for first run
                sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            }

            logger.info(`Fetching bookmarks since ${sinceDate.toISOString()}`);

            // Fetch all bookmarks and filter by date
            const allBookmarks = await repository.findAll();
            const bookmarks = allBookmarks.filter((b) => b.createdAt >= sinceDate);

            logger.info(`Found ${bookmarks.length} bookmarks`);

            // Save current timestamp for next run
            await bookmarkTimestampRepo.saveLastExecutionTime(new Date());

            // Convert Bookmark to BaseContent
            return bookmarks.map(
                (bookmark) =>
                    new BaseContent(
                        bookmark.url,
                        bookmark.sourceAdapter,
                        bookmark.tags,
                        bookmark.summary,
                        bookmark.rawContent,
                        bookmark.createdAt,
                        bookmark.updatedAt,
                        bookmark.contentType
                    )
            );
        },
    };
}

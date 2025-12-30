import { BaseContent, type ILogger, type ISourceReader, type SourceReaderConfig } from '@platform/platform-domain';
import { DrizzlePendingContentRepository } from '../DrizzlePendingContentRepository';

/**
 * Create a source reader that fetches all pending content from the database
 * Used by the scheduled enrichment workflow to process unenriched items
 */
export function createPendingContentSourceReader(logger: ILogger): ISourceReader {
    const pendingContentRepo = new DrizzlePendingContentRepository();

    return {
        async read(config: SourceReaderConfig): Promise<BaseContent[]> {
            logger.info('Fetching pending content from database...');

            // Get all pending items (or filter by user if specified)
            const pendingItems = config.userId
                ? await pendingContentRepo.findPendingByUserId(config.userId)
                : await pendingContentRepo.findAllPending();

            logger.info(`Found ${pendingItems.length} pending content items`);

            // Convert PendingContent to BaseContent
            // Store the mapping in metadata for the enrichment step
            const baseContents = pendingItems.map(
                (item) =>
                    new BaseContent(
                        item.url,
                        item.sourceAdapter,
                        [], // No tags yet - will be enriched
                        '', // No summary yet - will be enriched
                        item.rawContent,
                        item.createdAt,
                        item.updatedAt,
                        item.contentType
                    )
            );

            // TODO: is this actually used anywhere? explain
            // Store ID mapping for use by BookmarkEnrichmentStep
            // This will be added to context.metadata
            const idMapping: Record<string, string> = {};
            for (const item of pendingItems) {
                if (item.id) {
                    idMapping[item.url] = item.id;
                }
            }

            // Attach to config for access by workflow
            (config as any).pendingContentIds = idMapping;

            return baseContents;
        },
    };
}

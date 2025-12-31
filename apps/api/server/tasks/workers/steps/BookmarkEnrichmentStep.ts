import {
    BaseContent,
    Bookmark,
    type WorkflowContext,
    type StepResult,
    type IWebScraper,
    type IBookmarkEnricher,
    type IPendingContentRepository,
    type ILinkRepository,
    type SourceAdapter,
    MAX_EXTRACTED_URLS,
} from '@platform/platform-domain';
import type { StepFactoryConfig } from '../presets';
import { BaseWorkflowStep } from './BaseWorkflowStep';
import { toBaseContent } from './utils';

export interface BookmarkEnrichmentStepOptions {
    withNested?: boolean;
}

/**
 * Workflow step that enriches pending content by:
 * 1. Scraping the original URL to get page content
 * 2. Using AI to extract relevant URLs from the page (when withNested is true)
 * 3. For each extracted URL: scraping and analyzing to generate tags/summary
 * 4. Creating bookmarks for each enriched URL
 * 5. Archiving the original pending content
 */
export class BookmarkEnrichmentStep extends BaseWorkflowStep {
    readonly name = 'enrich-bookmarks';
    private readonly withNested: boolean;

    constructor(
        config: StepFactoryConfig,
        private readonly webScraper: IWebScraper,
        private readonly bookmarkEnricher: IBookmarkEnricher,
        private readonly pendingContentRepository: IPendingContentRepository,
        private readonly bookmarkRepository: ILinkRepository,
        private readonly options: BookmarkEnrichmentStepOptions = {}
    ) {
        super(config);
        this.withNested = options.withNested ?? false;
    }

    protected async doExecute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        const { items, metadata } = context;

        const userId = (metadata.userId as string | undefined) ?? this.userId;
        if (!userId) {
            return { context, continue: false, message: 'userId is required for bookmark enrichment' };
        }

        const pendingContentIds = (metadata.pendingContentIds as Record<string, string>) || {};
        const enrichedBookmarks: Bookmark[] = [];
        const results: Map<number, { success: boolean; error?: string }> = new Map();
        let processedCount = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const pendingContentId = pendingContentIds[item.url];

            const { bookmarks, success, error } = await this.processItem(item, pendingContentId, userId);

            enrichedBookmarks.push(...bookmarks);
            if (success) processedCount++;
            results.set(i, { success, error });

            await this.archivePendingContent(pendingContentId);
        }

        await this.reportProgress(context, items, (_, index) => results.get(index) ?? { success: true });

        if (enrichedBookmarks.length > 0) {
            await this.bookmarkRepository.saveMany(enrichedBookmarks);
            this.logger.info(`Saved ${enrichedBookmarks.length} enriched bookmarks`);
        }

        return {
            context: { ...context, items: enrichedBookmarks.map((b) => toBaseContent(b)) },
            continue: true,
            message: `Enriched ${processedCount} items, created ${enrichedBookmarks.length} bookmarks`,
        };
    }

    private async processItem(
        item: BaseContent,
        pendingContentId: string | undefined,
        userId: string
    ): Promise<{ bookmarks: Bookmark[]; success: boolean; error?: string }> {
        try {
            if (pendingContentId) {
                await this.pendingContentRepository.updateStatus(pendingContentId, 'processing');
            }

            const pageContent = await this.webScraper.scrape(item.url);
            if (!pageContent) {
                this.logger.warning(`Failed to scrape content from ${item.url}`);
                return { bookmarks: [], success: false, error: 'Failed to scrape content' };
            }

            const bookmarks: Bookmark[] = [];

            // Process nested URLs if enabled
            if (this.withNested) {
                const nestedBookmarks = await this.processNestedBookmarks(
                    item.url,
                    pageContent,
                    item.sourceAdapter,
                    userId
                );
                bookmarks.push(...nestedBookmarks);
            }

            const { tags, summary } = await this.bookmarkEnricher.analyzeContent(item.url, pageContent);
            const bookmark = new Bookmark(
                item.url,
                userId,
                item.sourceAdapter,
                tags,
                summary,
                '',
                new Date(),
                new Date(),
                'unknown'
            );

            if (bookmark) {
                this.logger.debug(`Created bookmark for extracted URL: ${item.url}, tags: ${bookmark.tags.join(', ')}, summary: ${bookmark.summary}`);
                bookmarks.push(bookmark);
            }

            return { bookmarks, success: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error enriching ${item.url}: ${message}`);
            return { bookmarks: [], success: false, error: message };
        }
    }

    private async scrapAndAnalyseExtractedUrl(
        url: string,
        sourceAdapter: SourceAdapter,
        userId: string
    ): Promise<Bookmark | null> {
        try {
            const content = await this.webScraper.scrape(url);
            if (!content) {
                this.logger.warning(`Failed to scrape extracted URL: ${url}`);
                return null;
            }

            const { tags, summary } = await this.bookmarkEnricher.analyzeContent(url, content);

            return new Bookmark(
                url,
                userId,
                sourceAdapter,
                tags,
                summary,
                '',
                new Date(),
                new Date(),
                'unknown'
            );
        } catch (error) {
            this.logger.error(
                `Error processing extracted URL ${url}: ${error instanceof Error ? error.message : error}`
            );
            return null;
        }
    }

    private async processNestedBookmarks(
        originalUrl: string,
        pageContent: string,
        sourceAdapter: SourceAdapter,
        userId: string
    ): Promise<Bookmark[]> {
        const bookmarks: Bookmark[] = [];
        const { extractedUrls } = await this.bookmarkEnricher.extractUrls(originalUrl, pageContent);
        const urlsToProcess = extractedUrls.slice(0, MAX_EXTRACTED_URLS);

        this.logger.info(`Extracted ${urlsToProcess.length} URLs from ${originalUrl}`);

        for (const url of urlsToProcess) {
            const bookmark = await this.scrapAndAnalyseExtractedUrl(url, sourceAdapter, userId);
            if (bookmark) {
                this.logger.debug(`Created bookmark for extracted URL: ${url}`);
                bookmarks.push(bookmark);
            }
        }

        return bookmarks;
    }

    private async archivePendingContent(pendingContentId: string | undefined): Promise<void> {
        if (pendingContentId) {
            await this.pendingContentRepository.updateStatus(pendingContentId, 'archived');
        }
    }
}

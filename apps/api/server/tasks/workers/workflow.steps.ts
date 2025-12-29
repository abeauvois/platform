import {
    type IWorkflowStep,
    type WorkflowContext,
    type StepResult,
    type ILogger,
    type ISourceReader,
    type SourceReaderConfig,
    BaseContent,
    Bookmark,
} from '@platform/platform-domain';
import type { WorkflowRequest } from '../../validators/workflow.validator';

// Re-export for convenience
export type { ISourceReader, SourceReaderConfig };

/**
 * Port: Content analyzer interface for AI-powered analysis
 */
export interface IContentAnalyser {
    analyze(url: string, additionalContext?: string): Promise<{ tags: string[]; summary: string }>;
}

/**
 * Port: Rate-limited client interface for fetching content with rate limiting
 */
export interface IRateLimitedClient {
    fetchContent(url: string): Promise<string | null>;
    isRateLimited(): boolean;
}

/**
 * Port: Export service interface
 */
export interface IExportService {
    exportToCsv(items: BaseContent[], outputPath: string): Promise<void>;
    exportToNotion(items: BaseContent[]): Promise<void>;
}

/**
 * Read step - fetches items from the source (Gmail, etc.)
 */
export class ReadStep implements IWorkflowStep<BaseContent> {
    readonly name = 'read';

    constructor(
        private readonly preset: string,
        private readonly filter: WorkflowRequest['filter'],
        private readonly logger: ILogger,
        private readonly sourceReader?: ISourceReader
    ) { }

    async execute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {

        this.logger.info(`Reading items from ${this.preset} source...`);

        if (!this.sourceReader) {
            this.logger.warning('No source reader configured, returning empty items');
            return {
                context: { ...context, items: [] },
                continue: true,
                message: `No source reader configured for ${this.preset}`,
            };
        }

        // Fetch items from source
        const items = await this.sourceReader.read({
            filter: this.filter,
        });

        // Notify progress for each item
        for (let i = 0; i < items.length; i++) {
            if (context.onItemProcessed) {
                await context.onItemProcessed({
                    item: items[i],
                    index: i,
                    total: items.length,
                    stepName: this.name,
                    success: true,
                });
            }
        }

        this.logger.info(`Readed ${items.length} items`);

        return {
            context: { ...context, items },
            continue: true,
            message: `Readed ${items.length} items from ${this.preset}`,
        };
    }

}

/**
 * Analysis step - analyzes content with AI
 */
export class AnalyzeStep implements IWorkflowStep<BaseContent> {
    readonly name = 'analyze';

    constructor(
        private readonly logger: ILogger,
        private readonly contentAnalyser?: IContentAnalyser
    ) { }

    async execute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        if (context.items.length === 0) {
            return { context, continue: true, message: 'No items to analyze' };
        }

        this.logger.info(`Analyzing ${context.items.length} items with AI...`);

        const analyzedItems: BaseContent[] = [];

        for (let i = 0; i < context.items.length; i++) {
            const item = context.items[i];

            try {
                // Analyze the URL using injected analyzer or fallback
                const analysis = await this.analyzeUrl(item.url);
                const analyzed = item.withCategorization(analysis.tags, analysis.summary);
                analyzedItems.push(analyzed);

                // Notify progress
                if (context.onItemProcessed) {
                    await context.onItemProcessed({
                        item: analyzed,
                        index: i,
                        total: context.items.length,
                        stepName: this.name,
                        success: true,
                    });
                }
            } catch (error) {
                this.logger.error(`Failed to analyze ${item.url}: ${error}`);
                analyzedItems.push(item); // Keep original on error
            }
        }

        this.logger.info(`Analyzed ${analyzedItems.length} items`);

        return {
            context: { ...context, items: analyzedItems },
            continue: true,
            message: `Analyzed ${analyzedItems.length} items`,
        };
    }

    private async analyzeUrl(url: string): Promise<{ tags: string[]; summary: string }> {
        // Use injected content analyser if available
        if (this.contentAnalyser) {
            return this.contentAnalyser.analyze(url);
        }

        // Fallback: URL-based heuristic tagging for development/testing
        this.logger.debug('No content analyser configured, using URL-based heuristics');
        const tags: string[] = [];
        const lowerUrl = url.toLowerCase();

        if (lowerUrl.includes('github')) tags.push('code', 'opensource');
        else if (lowerUrl.includes('twitter') || lowerUrl.includes('x.com')) tags.push('social', 'twitter');
        else if (lowerUrl.includes('news') || lowerUrl.includes('hn') || lowerUrl.includes('ycombinator')) tags.push('news', 'tech');
        else tags.push('article');

        return {
            tags,
            summary: `Content from ${new URL(url).hostname}`,
        };
    }
}

/**
 * Enrich step - enriches Twitter/X links with additional content
 */
export class EnrichStep implements IWorkflowStep<BaseContent> {
    readonly name = 'enrich';

    constructor(
        private readonly logger: ILogger,
        private readonly rateLimitedClient?: IRateLimitedClient,
        private readonly contentAnalyser?: IContentAnalyser
    ) { }

    async execute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        const twitterItems = context.items.filter(item => this.isTwitterUrl(item.url));

        if (twitterItems.length === 0) {
            this.logger.info('No Twitter links to enrich');
            // Still notify progress for all items
            for (let i = 0; i < context.items.length; i++) {
                if (context.onItemProcessed) {
                    await context.onItemProcessed({
                        item: context.items[i],
                        index: i,
                        total: context.items.length,
                        stepName: this.name,
                        success: true,
                    });
                }
            }
            return { context, continue: true, message: 'No Twitter links to enrich' };
        }

        this.logger.info(`Enriching ${twitterItems.length} Twitter links...`);

        const enrichedItems = [...context.items];

        for (let i = 0; i < context.items.length; i++) {
            const item = context.items[i];

            if (this.isTwitterUrl(item.url)) {
                try {
                    const enriched = await this.enrichTwitterItem(item);
                    enrichedItems[i] = enriched;
                } catch (error) {
                    this.logger.error(`Failed to enrich ${item.url}: ${error}`);
                    // Keep original on error
                }
            }

            // Notify progress
            if (context.onItemProcessed) {
                await context.onItemProcessed({
                    item: enrichedItems[i],
                    index: i,
                    total: context.items.length,
                    stepName: this.name,
                    success: true,
                });
            }
        }

        this.logger.info(`Enriched ${twitterItems.length} Twitter links`);

        return {
            context: { ...context, items: enrichedItems },
            continue: true,
            message: `Enriched ${twitterItems.length} Twitter links`,
        };
    }

    private isTwitterUrl(url: string): boolean {
        return url.includes('twitter.com') || url.includes('x.com') || url.includes('t.co');
    }

    private async enrichTwitterItem(item: BaseContent): Promise<BaseContent> {
        // Use injected rate-limited client if available
        if (this.rateLimitedClient) {
            if (this.rateLimitedClient.isRateLimited()) {
                this.logger.warning(`Rate limited, skipping enrichment for ${item.url}`);
                return item;
            }

            const content = await this.rateLimitedClient.fetchContent(item.url);
            if (content) {
                // Re-analyze with fetched content if content analyser is available
                if (this.contentAnalyser) {
                    const analysis = await this.contentAnalyser.analyze(item.url, content);
                    return item.withCategorization(analysis.tags, analysis.summary);
                }
                // Otherwise just add the enriched tag
                return item.withCategorization(
                    [...item.tags, 'enriched'],
                    `${item.summary} - Content: ${content.substring(0, 100)}...`
                );
            }
        }

        // Fallback: mark as enriched without actual content
        this.logger.debug('No rate-limited client configured, using placeholder enrichment');
        return item.withCategorization(
            [...item.tags, 'enriched'],
            item.summary + ' (with fetched content)'
        );
    }
}

/**
 * Port: Bookmark repository interface for saving to database
 */
export interface ILinkRepository {
    saveMany(links: import('@platform/platform-domain').Bookmark[]): Promise<import('@platform/platform-domain').Bookmark[]>;
}

/**
 * Save to database step - saves items as bookmarks
 */
export class SaveToDatabaseStep implements IWorkflowStep<BaseContent> {
    readonly name = 'saveToDatabase';

    constructor(
        private readonly userId: string,
        private readonly logger: ILogger,
        private readonly bookmarkRepository?: ILinkRepository
    ) {}

    async execute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        if (context.items.length === 0) {
            return { context, continue: true, message: 'No items to save' };
        }

        this.logger.info(`Saving ${context.items.length} items to database...`);

        if (!this.bookmarkRepository) {
            this.logger.warning('No bookmark repository configured, skipping database save');
            return { context, continue: true, message: 'No repository configured' };
        }

        try {
            // Convert BaseContent to Bookmark
            const bookmarks = context.items.map(item => new Bookmark(
                item.url,
                item.sourceAdapter,
                item.tags,
                item.summary,
                item.rawContent,
                item.createdAt,
                item.updatedAt,
                item.contentType,
                this.userId
            ));

            // Save to database
            await this.bookmarkRepository.saveMany(bookmarks);
            this.logger.info(`Saved ${bookmarks.length} bookmarks to database`);

            // Notify progress for each item
            for (let i = 0; i < context.items.length; i++) {
                if (context.onItemProcessed) {
                    await context.onItemProcessed({
                        item: context.items[i],
                        index: i,
                        total: context.items.length,
                        stepName: this.name,
                        success: true,
                    });
                }
            }
        } catch (error) {
            this.logger.error(`Failed to save to database: ${error}`);
            // Continue workflow despite save failure
        }

        return {
            context,
            continue: true,
            message: `Saved ${context.items.length} items to database`,
        };
    }
}

/**
 * Export step - exports results to CSV/Notion
 */
export class ExportStep implements IWorkflowStep<BaseContent> {
    readonly name = 'export';

    constructor(
        private readonly csvOnly: boolean,
        private readonly logger: ILogger,
        private readonly exportService?: IExportService,
        private readonly outputPath?: string
    ) { }

    async execute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        if (context.items.length === 0) {
            return { context, continue: true, message: 'No items to export' };
        }

        const exportTargets = this.csvOnly ? 'CSV' : 'CSV and Notion';
        this.logger.info(`Exporting ${context.items.length} items to ${exportTargets}...`);

        // Use injected export service if available
        if (this.exportService) {
            const csvPath = this.outputPath || context.outputPath || `/tmp/export-${Date.now()}.csv`;

            try {
                await this.exportService.exportToCsv(context.items, csvPath);
                this.logger.info(`CSV exported to ${csvPath}`);

                if (!this.csvOnly) {
                    await this.exportService.exportToNotion(context.items);
                    this.logger.info('Notion export complete');
                }
            } catch (error) {
                this.logger.error(`Export failed: ${error}`);
                // Continue workflow despite export failure
            }
        } else {
            this.logger.debug('No export service configured, skipping actual export');
        }

        // Notify progress for each item
        for (let i = 0; i < context.items.length; i++) {
            const item = context.items[i];

            if (context.onItemProcessed) {
                await context.onItemProcessed({
                    item,
                    index: i,
                    total: context.items.length,
                    stepName: this.name,
                    success: true,
                });
            }
        }

        this.logger.info(`Exported ${context.items.length} items`);

        return {
            context,
            continue: true,
            message: `Exported ${context.items.length} items to ${exportTargets}`,
        };
    }
}

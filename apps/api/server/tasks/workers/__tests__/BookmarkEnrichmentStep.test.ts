/**
 * Unit Tests: BookmarkEnrichmentStep
 *
 * Tests the enrichment process:
 * 1. Scrape the item's URL
 * 2. Analyze content to generate tags and summary
 * 3. Create a bookmark for the item
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
    BaseContent,
    PendingContent,
    Bookmark,
    type ILogger,
    type IWebScraper,
    type IBookmarkEnricher,
    type IPendingContentRepository,
    type ILinkRepository,
    type WorkflowContext,
    type UrlExtractionResult,
    type ContentAnalysisResult,
    type PendingContentStatus,
} from '@abeauvois/platform-domain';
import { BookmarkEnrichmentStep } from '../steps/BookmarkEnrichmentStep';
import type { StepFactoryConfig } from '../presets';

/**
 * Create a test logger
 */
function createTestLogger(): ILogger {
    return {
        info: () => {},
        warning: () => {},
        error: () => {},
        debug: () => {},
        await: () => ({ start: () => {}, update: () => {}, stop: () => {} }),
    };
}

/**
 * Create a test config for BookmarkEnrichmentStep
 */
function createTestConfig(overrides: Partial<StepFactoryConfig> = {}): StepFactoryConfig {
    return {
        logger: createTestLogger(),
        preset: 'bookmarkEnrichment',
        ...overrides,
    };
}

/**
 * Mock web scraper
 */
function createMockWebScraper(responses: Record<string, string | null>): IWebScraper {
    return {
        scrape: async (url: string) => responses[url] ?? null,
    };
}

/**
 * Mock bookmark enricher
 */
function createMockBookmarkEnricher(
    urlExtractions: Record<string, string[]>,
    contentAnalyses: Record<string, { tags: string[]; summary: string }>
): IBookmarkEnricher {
    return {
        extractUrls: async (url: string): Promise<UrlExtractionResult> => ({
            extractedUrls: urlExtractions[url] || [],
        }),
        analyzeContent: async (url: string): Promise<ContentAnalysisResult> =>
            contentAnalyses[url] || { tags: [], summary: '' },
    };
}

/**
 * In-memory pending content repository for testing
 */
class InMemoryPendingContentRepository implements IPendingContentRepository {
    private items: Map<string, PendingContent> = new Map();
    private idCounter = 0;

    async save(content: PendingContent): Promise<PendingContent> {
        const id = content.id || `pending-${++this.idCounter}`;
        const saved = new PendingContent(
            content.url,
            content.sourceAdapter,
            content.rawContent,
            content.contentType,
            content.status,
            content.userId,
            id,
            content.externalId,
            content.createdAt,
            content.updatedAt
        );
        this.items.set(id, saved);
        return saved;
    }

    async saveMany(contents: PendingContent[]): Promise<PendingContent[]> {
        const results: PendingContent[] = [];
        for (const content of contents) {
            results.push(await this.save(content));
        }
        return results;
    }

    async findPendingByUserId(userId: string): Promise<PendingContent[]> {
        return Array.from(this.items.values()).filter(
            (item) => item.userId === userId && item.status === 'pending'
        );
    }

    async findAllPending(): Promise<PendingContent[]> {
        return Array.from(this.items.values()).filter((item) => item.status === 'pending');
    }

    async updateStatus(id: string, status: PendingContentStatus): Promise<void> {
        const item = this.items.get(id);
        if (item) {
            this.items.set(id, item.withStatus(status));
        }
    }

    async existsByExternalId(userId: string, sourceAdapter: string, externalId: string): Promise<boolean> {
        return Array.from(this.items.values()).some(
            (item) =>
                item.userId === userId &&
                item.sourceAdapter === sourceAdapter &&
                item.externalId === externalId
        );
    }

    async findById(id: string): Promise<PendingContent | null> {
        return this.items.get(id) || null;
    }

    async existsByUrls(userId: string, urls: string[]): Promise<Set<string>> {
        const existing = Array.from(this.items.values())
            .filter((item) => item.userId === userId && urls.includes(item.url))
            .map((item) => item.url);
        return new Set(existing);
    }

    // Test helpers
    getAll(): PendingContent[] {
        return Array.from(this.items.values());
    }
}

/**
 * In-memory bookmark repository for testing
 */
class InMemoryBookmarkRepository implements ILinkRepository {
    private items: Map<string, Bookmark> = new Map();
    private idCounter = 0;

    async exists(url: string): Promise<boolean> {
        return Array.from(this.items.values()).some((item) => item.url === url);
    }

    async findByUrl(url: string): Promise<Bookmark | null> {
        return Array.from(this.items.values()).find((item) => item.url === url) || null;
    }

    async findById(id: string): Promise<Bookmark | null> {
        return this.items.get(id) || null;
    }

    async save(link: Bookmark): Promise<Bookmark> {
        const id = link.id || `bookmark-${++this.idCounter}`;
        const saved = new Bookmark(
            link.url,
            link.userId,
            link.sourceAdapter,
            link.tags,
            link.summary,
            link.rawContent,
            link.createdAt,
            link.updatedAt,
            link.contentType,
            id
        );
        this.items.set(id, saved);
        return saved;
    }

    async saveMany(links: Bookmark[]): Promise<Bookmark[]> {
        const results: Bookmark[] = [];
        for (const link of links) {
            results.push(await this.save(link));
        }
        return results;
    }

    async update(id: string, userId: string, updates: Partial<Bookmark>): Promise<Bookmark | null> {
        const existing = this.items.get(id);
        if (!existing || existing.userId !== userId) return null;
        const updated = new Bookmark(
            updates.url ?? existing.url,
            existing.userId,
            updates.sourceAdapter ?? existing.sourceAdapter,
            updates.tags ?? existing.tags,
            updates.summary ?? existing.summary,
            updates.rawContent ?? existing.rawContent,
            existing.createdAt,
            new Date(),
            updates.contentType ?? existing.contentType,
            existing.id
        );
        this.items.set(id, updated);
        return updated;
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const existing = this.items.get(id);
        if (!existing || existing.userId !== userId) return false;
        this.items.delete(id);
        return true;
    }

    async findAll(): Promise<Bookmark[]> {
        return Array.from(this.items.values());
    }

    async findByUserId(userId: string): Promise<Bookmark[]> {
        return Array.from(this.items.values()).filter((item) => item.userId === userId);
    }

    async clear(): Promise<void> {
        this.items.clear();
    }

    async existsByUrls(userId: string, urls: string[]): Promise<Set<string>> {
        const existing = Array.from(this.items.values())
            .filter((item) => item.userId === userId && urls.includes(item.url))
            .map((item) => item.url);
        return new Set(existing);
    }
}

describe('BookmarkEnrichmentStep', () => {
    let config: StepFactoryConfig;
    let pendingContentRepo: InMemoryPendingContentRepository;
    let bookmarkRepo: InMemoryBookmarkRepository;

    beforeEach(() => {
        config = createTestConfig();
        pendingContentRepo = new InMemoryPendingContentRepository();
        bookmarkRepo = new InMemoryBookmarkRepository();
    });

    test('should have correct step name', () => {
        const step = new BookmarkEnrichmentStep(
            config,
            createMockWebScraper({}),
            createMockBookmarkEnricher({}, {}),
            pendingContentRepo,
            bookmarkRepo
        );
        expect(step.name).toBe('enrich-bookmarks');
    });

    test('should return empty context when no items to process', async () => {
        const step = new BookmarkEnrichmentStep(
            config,
            createMockWebScraper({}),
            createMockBookmarkEnricher({}, {}),
            pendingContentRepo,
            bookmarkRepo
        );

        const context: WorkflowContext<BaseContent> = {
            userId: 'user-123',
            items: [],
            outputPath: '',
            updatedIds: new Set<string>(),
            metadata: {},
        };

        const result = await step.execute(context);

        expect(result.continue).toBe(true);
        expect(result.context.items).toHaveLength(0);
    });

    test('should scrape and analyze item URL to create bookmark', async () => {
        // Setup: pending content with a URL to enrich
        const pendingItem = await pendingContentRepo.save(
            new PendingContent(
                'https://article.example.com/post-1',
                'Gmail',
                'Article content',
                'email',
                'pending',
                'user-123',
                undefined,
                'gmail-msg-001'
            )
        );

        // Mock scraper returns page content
        const webScraper = createMockWebScraper({
            'https://article.example.com/post-1': 'Full article content about TypeScript best practices',
        });

        // Mock enricher analyzes content
        const bookmarkEnricher = createMockBookmarkEnricher(
            {
                'https://article.example.com/post-1': [], // extractUrls is called but result not used
            },
            {
                'https://article.example.com/post-1': { tags: ['typescript', 'programming'], summary: 'TypeScript best practices guide' },
            }
        );

        const step = new BookmarkEnrichmentStep(
            config,
            webScraper,
            bookmarkEnricher,
            pendingContentRepo,
            bookmarkRepo
        );

        // Convert pending content to BaseContent for workflow
        const context: WorkflowContext<BaseContent> = {
            userId: 'user-123',
            items: [
                new BaseContent(
                    pendingItem.url,
                    pendingItem.sourceAdapter,
                    [],
                    '',
                    pendingItem.rawContent,
                    pendingItem.createdAt,
                    pendingItem.updatedAt,
                    pendingItem.contentType
                ),
            ],
            outputPath: '',
            updatedIds: new Set<string>(),
            metadata: { pendingContentIds: { [pendingItem.url]: pendingItem.id }, userId: 'user-123' },
        };

        const result = await step.execute(context);

        // Should continue workflow
        expect(result.continue).toBe(true);

        // Should have created 1 bookmark for the item's URL
        const savedBookmarks = await bookmarkRepo.findAll();
        expect(savedBookmarks).toHaveLength(1);

        const bookmark = savedBookmarks[0];
        expect(bookmark.url).toBe('https://article.example.com/post-1');
        expect(bookmark.tags).toEqual(['typescript', 'programming']);
        expect(bookmark.summary).toBe('TypeScript best practices guide');

        // Should have archived the original pending content
        const archivedItem = await pendingContentRepo.findById(pendingItem.id!);
        expect(archivedItem?.status).toBe('archived');
    });

    test('should handle scraping failures gracefully', async () => {
        const pendingItem = await pendingContentRepo.save(
            new PendingContent(
                'https://broken.example.com',
                'Gmail',
                'Content',
                'email',
                'pending',
                'user-123'
            )
        );

        // Scraper returns null (failure)
        const webScraper = createMockWebScraper({
            'https://broken.example.com': null,
        });

        const step = new BookmarkEnrichmentStep(
            config,
            webScraper,
            createMockBookmarkEnricher({}, {}),
            pendingContentRepo,
            bookmarkRepo
        );

        const context: WorkflowContext<BaseContent> = {
            userId: 'user-123',
            items: [
                new BaseContent(
                    pendingItem.url,
                    pendingItem.sourceAdapter,
                    [],
                    '',
                    pendingItem.rawContent
                ),
            ],
            outputPath: '',
            updatedIds: new Set<string>(),
            metadata: { pendingContentIds: { [pendingItem.url]: pendingItem.id }, userId: 'user-123' },
        };

        const result = await step.execute(context);

        // Should still continue
        expect(result.continue).toBe(true);

        // No bookmarks created
        const savedBookmarks = await bookmarkRepo.findAll();
        expect(savedBookmarks).toHaveLength(0);

        // Original should still be archived (we tried but failed)
        const archivedItem = await pendingContentRepo.findById(pendingItem.id!);
        expect(archivedItem?.status).toBe('archived');
    });

    test('should report progress via callback', async () => {
        const pendingItem = await pendingContentRepo.save(
            new PendingContent(
                'https://example.com/page',
                'Gmail',
                'Content',
                'email',
                'pending',
                'user-123'
            )
        );

        const webScraper = createMockWebScraper({
            'https://example.com/page': 'Page content with links',
            'https://extracted.example.com': 'Extracted page content',
        });

        const bookmarkEnricher = createMockBookmarkEnricher(
            { 'https://example.com/page': ['https://extracted.example.com'] },
            { 'https://extracted.example.com': { tags: ['test'], summary: 'Test summary' } }
        );

        const step = new BookmarkEnrichmentStep(
            config,
            webScraper,
            bookmarkEnricher,
            pendingContentRepo,
            bookmarkRepo
        );

        const progressCalls: { index: number; total: number; stepName: string }[] = [];

        const context: WorkflowContext<BaseContent> = {
            userId: 'user-123',
            items: [
                new BaseContent(
                    pendingItem.url,
                    pendingItem.sourceAdapter,
                    [],
                    '',
                    pendingItem.rawContent
                ),
            ],
            outputPath: '',
            updatedIds: new Set<string>(),
            metadata: { pendingContentIds: { [pendingItem.url]: pendingItem.id }, userId: 'user-123' },
            onItemProcessed: async (info) => {
                progressCalls.push({ index: info.index, total: info.total, stepName: info.stepName });
            },
        };

        await step.execute(context);

        // Should have reported progress
        expect(progressCalls.length).toBeGreaterThan(0);
        expect(progressCalls[0].stepName).toBe('enrich-bookmarks');
    });

    test('should process multiple items and create one bookmark per item', async () => {
        const pendingItem1 = await pendingContentRepo.save(
            new PendingContent(
                'https://article1.example.com',
                'Gmail',
                'Content 1',
                'email',
                'pending',
                'user-123'
            )
        );

        const pendingItem2 = await pendingContentRepo.save(
            new PendingContent(
                'https://article2.example.com',
                'Gmail',
                'Content 2',
                'email',
                'pending',
                'user-123'
            )
        );

        const webScraper = createMockWebScraper({
            'https://article1.example.com': 'Article 1 content',
            'https://article2.example.com': 'Article 2 content',
        });

        const bookmarkEnricher = createMockBookmarkEnricher(
            {
                'https://article1.example.com': [],
                'https://article2.example.com': [],
            },
            {
                'https://article1.example.com': { tags: ['tag1'], summary: 'Summary 1' },
                'https://article2.example.com': { tags: ['tag2'], summary: 'Summary 2' },
            }
        );

        const step = new BookmarkEnrichmentStep(
            config,
            webScraper,
            bookmarkEnricher,
            pendingContentRepo,
            bookmarkRepo
        );

        const context: WorkflowContext<BaseContent> = {
            userId: 'user-123',
            items: [
                new BaseContent(pendingItem1.url, pendingItem1.sourceAdapter, [], '', pendingItem1.rawContent),
                new BaseContent(pendingItem2.url, pendingItem2.sourceAdapter, [], '', pendingItem2.rawContent),
            ],
            outputPath: '',
            updatedIds: new Set<string>(),
            metadata: {
                pendingContentIds: {
                    [pendingItem1.url]: pendingItem1.id,
                    [pendingItem2.url]: pendingItem2.id,
                },
                userId: 'user-123',
            },
        };

        await step.execute(context);

        // Should create 1 bookmark per item (2 total)
        const savedBookmarks = await bookmarkRepo.findAll();
        expect(savedBookmarks).toHaveLength(2);

        expect(savedBookmarks.find((b) => b.url === 'https://article1.example.com')).toBeDefined();
        expect(savedBookmarks.find((b) => b.url === 'https://article2.example.com')).toBeDefined();
    });

    describe('withNested option', () => {
        test('should NOT process nested URLs when withNested is false (default)', async () => {
            const pendingItem = await pendingContentRepo.save(
                new PendingContent(
                    'https://newsletter.example.com',
                    'Gmail',
                    'Newsletter content',
                    'email',
                    'pending',
                    'user-123'
                )
            );

            // Scraper returns content for both original and extracted URLs
            const webScraper = createMockWebScraper({
                'https://newsletter.example.com': 'Newsletter with links to articles',
                'https://article1.example.com': 'Article 1 content',
                'https://article2.example.com': 'Article 2 content',
            });

            // Enricher would extract URLs, but they shouldn't be processed
            const bookmarkEnricher = createMockBookmarkEnricher(
                {
                    'https://newsletter.example.com': ['https://article1.example.com', 'https://article2.example.com'],
                },
                {
                    'https://newsletter.example.com': { tags: ['newsletter'], summary: 'Weekly newsletter' },
                    'https://article1.example.com': { tags: ['article1'], summary: 'Article 1' },
                    'https://article2.example.com': { tags: ['article2'], summary: 'Article 2' },
                }
            );

            // Default: withNested is false
            const step = new BookmarkEnrichmentStep(
                config,
                webScraper,
                bookmarkEnricher,
                pendingContentRepo,
                bookmarkRepo
            );

            const context: WorkflowContext<BaseContent> = {
                userId: 'user-123',
                items: [new BaseContent(pendingItem.url, pendingItem.sourceAdapter, [], '', pendingItem.rawContent)],
                outputPath: '',
                updatedIds: new Set<string>(),
                metadata: { pendingContentIds: { [pendingItem.url]: pendingItem.id }, userId: 'user-123' },
            };

            await step.execute(context);

            // Should create only 1 bookmark for the original URL (not nested ones)
            const savedBookmarks = await bookmarkRepo.findAll();
            expect(savedBookmarks).toHaveLength(1);
            expect(savedBookmarks[0].url).toBe('https://newsletter.example.com');
        });

        test('should process nested URLs when withNested is true', async () => {
            const pendingItem = await pendingContentRepo.save(
                new PendingContent(
                    'https://newsletter.example.com',
                    'Gmail',
                    'Newsletter content',
                    'email',
                    'pending',
                    'user-123'
                )
            );

            // Scraper returns content for both original and extracted URLs
            const webScraper = createMockWebScraper({
                'https://newsletter.example.com': 'Newsletter with links to articles',
                'https://article1.example.com': 'Article 1 content',
                'https://article2.example.com': 'Article 2 content',
            });

            // Enricher extracts URLs and provides analysis for each
            const bookmarkEnricher = createMockBookmarkEnricher(
                {
                    'https://newsletter.example.com': ['https://article1.example.com', 'https://article2.example.com'],
                },
                {
                    'https://newsletter.example.com': { tags: ['newsletter'], summary: 'Weekly newsletter' },
                    'https://article1.example.com': { tags: ['article1'], summary: 'Article 1' },
                    'https://article2.example.com': { tags: ['article2'], summary: 'Article 2' },
                }
            );

            // Enable nested processing
            const step = new BookmarkEnrichmentStep(
                config,
                webScraper,
                bookmarkEnricher,
                pendingContentRepo,
                bookmarkRepo,
                { withNested: true }
            );

            const context: WorkflowContext<BaseContent> = {
                userId: 'user-123',
                items: [new BaseContent(pendingItem.url, pendingItem.sourceAdapter, [], '', pendingItem.rawContent)],
                outputPath: '',
                updatedIds: new Set<string>(),
                metadata: { pendingContentIds: { [pendingItem.url]: pendingItem.id }, userId: 'user-123' },
            };

            await step.execute(context);

            // Should create bookmarks for original + nested URLs (3 total)
            const savedBookmarks = await bookmarkRepo.findAll();
            expect(savedBookmarks).toHaveLength(3);

            expect(savedBookmarks.find((b) => b.url === 'https://newsletter.example.com')).toBeDefined();
            expect(savedBookmarks.find((b) => b.url === 'https://article1.example.com')).toBeDefined();
            expect(savedBookmarks.find((b) => b.url === 'https://article2.example.com')).toBeDefined();
        });

        test('should handle empty extraction gracefully when withNested is true', async () => {
            const pendingItem = await pendingContentRepo.save(
                new PendingContent(
                    'https://simple-page.example.com',
                    'Gmail',
                    'Simple page content',
                    'email',
                    'pending',
                    'user-123'
                )
            );

            const webScraper = createMockWebScraper({
                'https://simple-page.example.com': 'Simple page with no interesting links',
            });

            // No URLs extracted
            const bookmarkEnricher = createMockBookmarkEnricher(
                {
                    'https://simple-page.example.com': [], // Empty extraction
                },
                {
                    'https://simple-page.example.com': { tags: ['simple'], summary: 'A simple page' },
                }
            );

            const step = new BookmarkEnrichmentStep(
                config,
                webScraper,
                bookmarkEnricher,
                pendingContentRepo,
                bookmarkRepo,
                { withNested: true }
            );

            const context: WorkflowContext<BaseContent> = {
                userId: 'user-123',
                items: [new BaseContent(pendingItem.url, pendingItem.sourceAdapter, [], '', pendingItem.rawContent)],
                outputPath: '',
                updatedIds: new Set<string>(),
                metadata: { pendingContentIds: { [pendingItem.url]: pendingItem.id }, userId: 'user-123' },
            };

            await step.execute(context);

            // Should still create bookmark for original URL
            const savedBookmarks = await bookmarkRepo.findAll();
            expect(savedBookmarks).toHaveLength(1);
            expect(savedBookmarks[0].url).toBe('https://simple-page.example.com');
        });

        test('should handle partial nested URL failures when withNested is true', async () => {
            const pendingItem = await pendingContentRepo.save(
                new PendingContent(
                    'https://newsletter.example.com',
                    'Gmail',
                    'Newsletter content',
                    'email',
                    'pending',
                    'user-123'
                )
            );

            // One extracted URL fails to scrape
            const webScraper = createMockWebScraper({
                'https://newsletter.example.com': 'Newsletter with links',
                'https://working.example.com': 'Working article content',
                'https://broken.example.com': null, // Scraping fails
            });

            const bookmarkEnricher = createMockBookmarkEnricher(
                {
                    'https://newsletter.example.com': ['https://working.example.com', 'https://broken.example.com'],
                },
                {
                    'https://newsletter.example.com': { tags: ['newsletter'], summary: 'Newsletter' },
                    'https://working.example.com': { tags: ['working'], summary: 'Working article' },
                }
            );

            const step = new BookmarkEnrichmentStep(
                config,
                webScraper,
                bookmarkEnricher,
                pendingContentRepo,
                bookmarkRepo,
                { withNested: true }
            );

            const context: WorkflowContext<BaseContent> = {
                userId: 'user-123',
                items: [new BaseContent(pendingItem.url, pendingItem.sourceAdapter, [], '', pendingItem.rawContent)],
                outputPath: '',
                updatedIds: new Set<string>(),
                metadata: { pendingContentIds: { [pendingItem.url]: pendingItem.id }, userId: 'user-123' },
            };

            await step.execute(context);

            // Should create bookmarks for original + successful nested URL (2 total)
            const savedBookmarks = await bookmarkRepo.findAll();
            expect(savedBookmarks).toHaveLength(2);

            expect(savedBookmarks.find((b) => b.url === 'https://newsletter.example.com')).toBeDefined();
            expect(savedBookmarks.find((b) => b.url === 'https://working.example.com')).toBeDefined();
            expect(savedBookmarks.find((b) => b.url === 'https://broken.example.com')).toBeUndefined();
        });
    });
});

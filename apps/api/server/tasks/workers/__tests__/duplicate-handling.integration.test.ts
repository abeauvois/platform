/**
 * Integration Tests: Duplicate Handling in Ingestion
 *
 * Tests that workflow steps properly handle duplicates by pre-filtering
 * URLs before batch insert, preventing constraint violations from stopping
 * the entire ingestion.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
    BaseContent,
    PendingContent,
    Bookmark,
    type ILogger,
    type IPendingContentRepository,
    type ILinkRepository,
    type WorkflowContext,
    type PendingContentStatus,
} from '@platform/platform-domain';
import { SaveToPendingContentStep } from '../steps/SaveToPendingContentStep';
import { SaveToBookmarkStep } from '../steps/SaveToBookmarkStep';
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
 * In-memory pending content repository for testing with URL pre-filtering support
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
            // Simulate unique constraint: check for duplicate URLs per user
            const existingUrls = Array.from(this.items.values())
                .filter((item) => item.userId === content.userId)
                .map((item) => item.url);
            if (existingUrls.includes(content.url)) {
                throw new Error(`Duplicate URL: ${content.url}`);
            }
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
        const existingUrls = Array.from(this.items.values())
            .filter((item) => item.userId === userId && urls.includes(item.url))
            .map((item) => item.url);
        return new Set(existingUrls);
    }

    // Test helpers
    getAll(): PendingContent[] {
        return Array.from(this.items.values());
    }

    clear(): void {
        this.items.clear();
        this.idCounter = 0;
    }
}

/**
 * In-memory bookmark repository for testing with URL pre-filtering support
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
        this.idCounter = 0;
    }

    async existsByUrls(userId: string, urls: string[]): Promise<Set<string>> {
        const existingUrls = Array.from(this.items.values())
            .filter((item) => item.userId === userId && urls.includes(item.url))
            .map((item) => item.url);
        return new Set(existingUrls);
    }
}

describe('Duplicate handling in ingestion', () => {
    const userId = 'test-user-123';
    let logger: ILogger;
    let pendingContentRepo: InMemoryPendingContentRepository;
    let bookmarkRepo: InMemoryBookmarkRepository;

    beforeEach(() => {
        logger = createTestLogger();
        pendingContentRepo = new InMemoryPendingContentRepository();
        bookmarkRepo = new InMemoryBookmarkRepository();
    });

    function createStepConfig(overrides: Partial<StepFactoryConfig> = {}): StepFactoryConfig {
        return {
            logger,
            preset: 'gmail',
            userId,
            ...overrides,
        };
    }

    describe('SaveToPendingContentStep', () => {
        test('should skip items with URLs already in pending_content', async () => {
            // Arrange: Pre-existing item with duplicate URL
            await pendingContentRepo.save(
                new PendingContent(
                    'https://existing.example.com/article',
                    'Gmail',
                    'Existing content',
                    'email',
                    'pending',
                    userId,
                    undefined,
                    'existing-external-id'
                )
            );

            const step = new SaveToPendingContentStep(
                createStepConfig(),
                pendingContentRepo,
                (item) => item.rawContent // Use rawContent as externalId for testing
            );

            const context: WorkflowContext<BaseContent> = {
                items: [
                    // Duplicate URL (should be skipped)
                    new BaseContent(
                        'https://existing.example.com/article',
                        'Gmail',
                        ['tag1'],
                        'Summary 1',
                        'duplicate-external-id'
                    ),
                    // New URL (should be saved)
                    new BaseContent(
                        'https://new.example.com/article',
                        'Gmail',
                        ['tag2'],
                        'Summary 2',
                        'new-external-id'
                    ),
                ],
                outputPath: '',
                updatedIds: new Set<string>(),
                metadata: {},
            };

            // Act
            const result = await step.execute(context);

            // Assert
            expect(result.continue).toBe(true);
            const allItems = pendingContentRepo.getAll();
            expect(allItems).toHaveLength(2); // 1 existing + 1 new (duplicate skipped)
            expect(allItems.find((i) => i.url === 'https://new.example.com/article')).toBeDefined();
        });

        test('should save items with unique URLs', async () => {
            const step = new SaveToPendingContentStep(createStepConfig(), pendingContentRepo);

            const context: WorkflowContext<BaseContent> = {
                items: [
                    new BaseContent('https://unique1.example.com', 'Gmail', ['tag1'], 'Summary 1', 'content1'),
                    new BaseContent('https://unique2.example.com', 'Gmail', ['tag2'], 'Summary 2', 'content2'),
                ],
                outputPath: '',
                updatedIds: new Set<string>(),
                metadata: {},
            };

            // Act
            const result = await step.execute(context);

            // Assert
            expect(result.continue).toBe(true);
            const allItems = pendingContentRepo.getAll();
            expect(allItems).toHaveLength(2);
        });

        test('should continue workflow after skipping duplicates', async () => {
            // Arrange: Pre-existing items
            await pendingContentRepo.save(
                new PendingContent('https://dup1.example.com', 'Gmail', '', 'email', 'pending', userId)
            );
            await pendingContentRepo.save(
                new PendingContent('https://dup2.example.com', 'Gmail', '', 'email', 'pending', userId)
            );

            const step = new SaveToPendingContentStep(createStepConfig(), pendingContentRepo);

            const context: WorkflowContext<BaseContent> = {
                items: [
                    // All duplicates
                    new BaseContent('https://dup1.example.com', 'Gmail', [], '', ''),
                    new BaseContent('https://dup2.example.com', 'Gmail', [], '', ''),
                ],
                outputPath: '',
                updatedIds: new Set<string>(),
                metadata: {},
            };

            // Act
            const result = await step.execute(context);

            // Assert: Should continue even when all items are duplicates
            expect(result.continue).toBe(true);
            expect(pendingContentRepo.getAll()).toHaveLength(2); // Only original items
        });

        test('should log skipped duplicates', async () => {
            const loggedMessages: string[] = [];
            const loggingLogger: ILogger = {
                info: (msg: string) => loggedMessages.push(msg),
                warning: () => {},
                error: () => {},
                debug: () => {},
                await: () => ({ start: () => {}, update: () => {}, stop: () => {} }),
            };

            await pendingContentRepo.save(
                new PendingContent('https://duplicate.example.com', 'Gmail', '', 'email', 'pending', userId)
            );

            const step = new SaveToPendingContentStep(
                createStepConfig({ logger: loggingLogger }),
                pendingContentRepo
            );

            const context: WorkflowContext<BaseContent> = {
                items: [new BaseContent('https://duplicate.example.com', 'Gmail', [], '', '')],
                outputPath: '',
                updatedIds: new Set<string>(),
                metadata: {},
            };

            // Act
            await step.execute(context);

            // Assert: Should have logged about skipping duplicate
            expect(loggedMessages.some((msg) => msg.includes('skip') || msg.includes('duplicate'))).toBe(true);
        });
    });

    describe('SaveToBookmarkStep', () => {
        test('should skip items with URLs already in bookmarks', async () => {
            // Arrange: Pre-existing bookmark
            await bookmarkRepo.save(
                new Bookmark(
                    'https://existing-bookmark.example.com',
                    userId,
                    'Gmail',
                    ['existing'],
                    'Existing summary',
                    'Existing content'
                )
            );

            const step = new SaveToBookmarkStep(createStepConfig(), bookmarkRepo);

            const context: WorkflowContext<BaseContent> = {
                items: [
                    // Duplicate URL (should be skipped)
                    new BaseContent(
                        'https://existing-bookmark.example.com',
                        'Gmail',
                        ['new-tag'],
                        'New summary',
                        'New content'
                    ),
                    // New URL (should be saved)
                    new BaseContent(
                        'https://new-bookmark.example.com',
                        'Gmail',
                        ['tag2'],
                        'Summary 2',
                        'Content 2'
                    ),
                ],
                outputPath: '',
                updatedIds: new Set<string>(),
                metadata: {},
            };

            // Act
            const result = await step.execute(context);

            // Assert
            expect(result.continue).toBe(true);
            const allBookmarks = await bookmarkRepo.findAll();
            expect(allBookmarks).toHaveLength(2); // 1 existing + 1 new (duplicate skipped)
            expect(allBookmarks.find((b) => b.url === 'https://new-bookmark.example.com')).toBeDefined();
        });

        test('should save items with unique URLs', async () => {
            const step = new SaveToBookmarkStep(createStepConfig(), bookmarkRepo);

            const context: WorkflowContext<BaseContent> = {
                items: [
                    new BaseContent('https://unique1.example.com', 'Gmail', ['tag1'], 'Summary 1', 'content1'),
                    new BaseContent('https://unique2.example.com', 'Gmail', ['tag2'], 'Summary 2', 'content2'),
                ],
                outputPath: '',
                updatedIds: new Set<string>(),
                metadata: {},
            };

            // Act
            const result = await step.execute(context);

            // Assert
            expect(result.continue).toBe(true);
            const allBookmarks = await bookmarkRepo.findAll();
            expect(allBookmarks).toHaveLength(2);
        });

        test('should continue workflow after skipping duplicates', async () => {
            // Arrange: Pre-existing bookmarks
            await bookmarkRepo.save(new Bookmark('https://dup1.example.com', userId, 'Gmail', [], '', ''));
            await bookmarkRepo.save(new Bookmark('https://dup2.example.com', userId, 'Gmail', [], '', ''));

            const step = new SaveToBookmarkStep(createStepConfig(), bookmarkRepo);

            const context: WorkflowContext<BaseContent> = {
                items: [
                    // All duplicates
                    new BaseContent('https://dup1.example.com', 'Gmail', [], '', ''),
                    new BaseContent('https://dup2.example.com', 'Gmail', [], '', ''),
                ],
                outputPath: '',
                updatedIds: new Set<string>(),
                metadata: {},
            };

            // Act
            const result = await step.execute(context);

            // Assert: Should continue even when all items are duplicates
            expect(result.continue).toBe(true);
            const allBookmarks = await bookmarkRepo.findAll();
            expect(allBookmarks).toHaveLength(2); // Only original items
        });
    });
});

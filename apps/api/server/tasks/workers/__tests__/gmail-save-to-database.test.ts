/**
 * Unit Tests: Gmail Preset - Save to Database
 * Tests that the gmail workflow saves items to the bookmark repository when saveTo === 'database'
 *
 * These tests use InMemoryBookmarkRepository to avoid database dependencies.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { BaseContent, type ISourceReader, type ILogger, type WorkflowContext } from '@platform/platform-domain';
import { InMemoryBookmarkRepository } from '../../../infrastructure/InMemoryBookmarkRepository';
import { ReadStep, SaveToBookmarkStep } from '../steps';
import type { StepFactoryConfig } from '../presets';

/**
 * Mock source reader that returns test data
 */
function createMockSourceReader(items: BaseContent[]): ISourceReader {
    return {
        read: async () => items,
    };
}

/**
 * Create a test logger
 */
function createTestLogger(): ILogger {
    return {
        info: () => { },
        warning: () => { },
        error: () => { },
        debug: () => { },
        await: () => ({ start: () => { }, update: () => { }, stop: () => { } }),
    };
}

/**
 * Create a test config for ReadStep
 */
function createReadStepConfig(sourceReader?: ISourceReader): StepFactoryConfig {
    return {
        logger: createTestLogger(),
        preset: 'gmail',
        sourceReader,
    };
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

describe('Gmail Preset - Save to Database', () => {
    let bookmarkRepository: InMemoryBookmarkRepository;
    let logger: ILogger;

    beforeEach(() => {
        bookmarkRepository = new InMemoryBookmarkRepository();
        logger = createTestLogger();
    });

    test('should save items to bookmark repository when saveTo is database', async () => {
        // Arrange
        const testItems = [
            new BaseContent(
                'https://example.com/article1',
                'Gmail',
                ['tech', 'news'],
                'First article summary',
                'Raw content 1'
            ),
            new BaseContent(
                'https://example.com/article2',
                'Gmail',
                ['programming'],
                'Second article summary',
                'from: Alexandre Beauvois <abeauvois@gmail.com>to: Alexandre Beauvois <abeauvois@gmail.com>subject: Could Gravity Reveal Signs That We Live In a Simulation?date: Thu, 25 Dec 2025 23:33:15 +0000url: https://www.popularmechanics.com/science/a69852300/gravity-information-simulation-universe/https://www.popularmechanics.com/science/a69852300/gravity-information-simulation-universe/'
            ),
        ];

        const mockSourceReader = createMockSourceReader(testItems);

        // Create steps directly (simulating gmail preset with saveTo='database')
        const readStep = new ReadStep(createReadStepConfig(mockSourceReader));
        const saveStep = new SaveToBookmarkStep('test-user-123', logger, bookmarkRepository);

        // Act - Execute all steps
        let context: WorkflowContext<BaseContent> = { items: [], outputPath: '', updatedIds: new Set<string>(), metadata: {} };
        const readResult = await readStep.execute(context);
        context = readResult.context;
        await saveStep.execute(context);

        // Assert
        const savedBookmarks = await bookmarkRepository.findAll();
        expect(savedBookmarks).toHaveLength(2);

        // Verify all saved bookmarks have valid URLs
        for (const bookmark of savedBookmarks) {
            expect(isValidUrl(bookmark.url)).toBe(true);
        }

        const bookmark1 = savedBookmarks.find(b => b.url === 'https://example.com/article1');
        expect(bookmark1).toBeDefined();
        expect(bookmark1?.userId).toBe('test-user-123');
        expect(bookmark1?.sourceAdapter).toBe('Gmail');
        expect(bookmark1?.tags).toEqual(['tech', 'news']);
        expect(bookmark1?.summary).toBe('First article summary');

        const bookmark2 = savedBookmarks.find(b => b.url === 'https://example.com/article2');
        expect(bookmark2).toBeDefined();
        expect(bookmark2?.userId).toBe('test-user-123');
        expect(bookmark2?.tags).toEqual(['programming']);
    });

    test('SaveToBookmarkStep has correct name', () => {
        // Verify step naming for workflow integration
        const saveStep = new SaveToBookmarkStep('test-user', logger, bookmarkRepository);
        expect(saveStep.name).toBe('saveToDatabase');
    });

    test('ReadStep has correct name', () => {
        // Verify step naming for workflow integration
        const readStep = new ReadStep(createReadStepConfig());
        expect(readStep.name).toBe('read');
    });

    test('should handle empty items gracefully', async () => {
        // Arrange
        const mockSourceReader = createMockSourceReader([]);
        const readStep = new ReadStep(createReadStepConfig(mockSourceReader));
        const saveStep = new SaveToBookmarkStep('test-user', logger, bookmarkRepository);

        // Act
        let context: WorkflowContext<BaseContent> = { items: [], outputPath: '', updatedIds: new Set<string>(), metadata: {} };
        const readResult = await readStep.execute(context);
        context = readResult.context;
        await saveStep.execute(context);

        // Assert
        const savedBookmarks = await bookmarkRepository.findAll();
        expect(savedBookmarks).toHaveLength(0);
    });

    test('should preserve all BaseContent fields when saving to bookmarks', async () => {
        // Arrange
        const now = new Date();
        const testItem = new BaseContent(
            'https://example.com/full-test',
            'Gmail',
            ['tag1', 'tag2', 'tag3'],
            'Detailed summary here',
            'Full raw content with lots of text',
            now,
            now,
            'email'
        );

        const mockSourceReader = createMockSourceReader([testItem]);
        const readStep = new ReadStep(createReadStepConfig(mockSourceReader));
        const saveStep = new SaveToBookmarkStep('user-with-full-data', logger, bookmarkRepository);

        // Act
        let context: WorkflowContext<BaseContent> = { items: [], outputPath: '', updatedIds: new Set<string>(), metadata: {} };
        const readResult = await readStep.execute(context);
        context = readResult.context;
        await saveStep.execute(context);

        // Assert
        const savedBookmarks = await bookmarkRepository.findAll();
        expect(savedBookmarks).toHaveLength(1);

        const bookmark = savedBookmarks[0];
        expect(isValidUrl(bookmark.url)).toBe(true);
        expect(bookmark.url).toBe('https://example.com/full-test');
        expect(bookmark.sourceAdapter).toBe('Gmail');
        expect(bookmark.tags).toEqual(['tag1', 'tag2', 'tag3']);
        expect(bookmark.summary).toBe('Detailed summary here');
        expect(bookmark.rawContent).toBe('Full raw content with lots of text');
        expect(bookmark.contentType).toBe('email');
        expect(bookmark.userId).toBe('user-with-full-data');
    });

    test('should skip saving when no repository is provided', async () => {
        // Arrange
        const testItem = new BaseContent(
            'https://example.com/test',
            'Gmail',
            ['test'],
            'Test summary',
            'Test content'
        );

        // SaveToBookmarkStep without repository
        const saveStep = new SaveToBookmarkStep('test-user', logger, undefined);

        // Act
        const context: WorkflowContext<BaseContent> = { items: [testItem], outputPath: '', updatedIds: new Set<string>(), metadata: {} };
        const result = await saveStep.execute(context);

        // Assert - should continue without error
        expect(result.continue).toBe(true);
        expect(result.message).toBe('No repository configured');
    });
});

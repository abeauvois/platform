import { test, expect, describe } from 'bun:test';
import { join } from 'node:path';
import { CsvFromZipBookmarksWorkflowService } from '../../../application/services/CsvFromZipBookmarksWorkflowService';
import { DirectoryReader } from '../../adapters/DirectoryReader';
import { SimpleCsvParser } from '../../adapters/SimpleCsvParser';
import { ConsoleLogger } from './ConsoleLogger';

const FIXTURES_DIR = join(__dirname, '../fixtures');

describe('CsvFromZipBookmarksWorkflowService Integration Tests', () => {
    const logger = new ConsoleLogger();
    const directoryReader = new DirectoryReader();
    const csvParser = new SimpleCsvParser();

    test('should extract and parse CSV bookmarks from zip file', async () => {
        const service = new CsvFromZipBookmarksWorkflowService(
            directoryReader,
            csvParser,
            logger
        );
        const zipPath = join(FIXTURES_DIR, 'test_csv_bookmarks.zip');

        // ACT
        const items = await service.extractAndParseCsv(zipPath);

        // ASSERT
        expect(items.length).toBe(3);
        console.log(`✅ Extracted ${items.length} items from CSV`);

        // Verify first item
        expect(items[0].url).toBe('https://example.com/typescript-guide');
        expect(items[0].tags).toEqual(['programming', 'typescript', 'web']);
        expect(items[0].summary).toBe('Comprehensive guide to TypeScript best practices');

        // Verify second item
        expect(items[1].url).toBe('https://example.com/ml-intro');
        expect(items[1].tags).toEqual(['ai', 'machine-learning', 'data-science']);

        // Verify third item
        expect(items[2].url).toBe('https://example.com/docker-tutorial');
        expect(items[2].tags).toEqual(['devops', 'docker', 'containers']);
    });

    test('should handle errors gracefully', async () => {
        const service = new CsvFromZipBookmarksWorkflowService(
            directoryReader,
            csvParser,
            logger
        );
        const nonExistentPath = join(FIXTURES_DIR, 'does-not-exist.zip');

        // ACT & ASSERT
        await expect(service.extractAndParseCsv(nonExistentPath)).rejects.toThrow();
        console.log(`✅ Correctly throws error for non-existent file`);
    });

    test('should return statistics about processed items', async () => {
        const service = new CsvFromZipBookmarksWorkflowService(
            directoryReader,
            csvParser,
            logger
        );
        const zipPath = join(FIXTURES_DIR, 'test_csv_bookmarks.zip');

        let capturedStats: any;

        // ACT
        const items = await service.extractAndParseCsv(zipPath, {
            onComplete: async (stats) => {
                capturedStats = stats;
            }
        });

        // ASSERT
        expect(capturedStats).toBeDefined();
        expect(capturedStats.itemsProduced).toBeGreaterThan(0);
        expect(capturedStats.itemsConsumed).toBe(3);
        expect(capturedStats.errors).toBe(0);
        console.log(`✅ Statistics: produced=${capturedStats.itemsProduced}, consumed=${capturedStats.itemsConsumed}`);
    });

    test('should deduplicate bookmarks with same URL', async () => {
        const service = new CsvFromZipBookmarksWorkflowService(
            directoryReader,
            csvParser,
            logger,
            true
        );
        const zipPath = join(FIXTURES_DIR, 'test_csv_bookmarks.zip');

        // ACT
        const items = await service.extractAndParseCsv(zipPath);

        // ASSERT - All URLs should be unique
        const urls = items.map(item => item.url);
        const uniqueUrls = new Set(urls);
        expect(urls.length).toBe(uniqueUrls.size);
        console.log(`✅ All ${items.length} items have unique URLs`);
    });

    test('should preserve structured data from CSV', async () => {
        const service = new CsvFromZipBookmarksWorkflowService(
            directoryReader,
            csvParser,
            logger
        );
        const zipPath = join(FIXTURES_DIR, 'test_csv_bookmarks.zip');

        // ACT
        const items = await service.extractAndParseCsv(zipPath);

        // ASSERT - rawContent should contain structured JSON
        const firstItem = items[0];
        const structuredData = JSON.parse(firstItem.rawContent);

        expect(structuredData.url).toBe('https://example.com/typescript-guide');
        expect(structuredData.tags).toBe('programming;typescript;web');
        expect(structuredData.summary).toBeDefined();
        console.log(`✅ Structured data preserved in rawContent`);
    });
});

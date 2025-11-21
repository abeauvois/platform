import { test, expect, describe } from 'bun:test';
import { join } from 'path';
import { ZipFileDataSource } from '../../adapters/ZipFileDataSource.js';
import { ZipExtractor } from '../../adapters/ZipExtractor.js';
import { FileIngestionConfig } from '../../../domain/entities/IngestionConfig.js';
import { SourceAdapter } from '../../../domain/entities/SourceAdapter.js';
import { ILogger } from '../../../domain/ports/ILogger.js';

// Simple console logger for integration tests
class ConsoleLogger implements ILogger {
    info(message: string, options?: { prefix?: string; suffix?: string }): void {
        console.log(`[INFO] ${message}`);
    }

    error(message: string, options?: { prefix?: string; suffix?: string }): void {
        console.error(`[ERROR] ${message}`);
    }

    warning(message: string, options?: { prefix?: string; suffix?: string }): void {
        console.warn(`[WARNING] ${message}`);
    }

    debug(message: string, options?: { prefix?: string; suffix?: string }): void {
        console.debug(`[DEBUG] ${message}`);
    }

    await(message: string, options?: { prefix?: string; suffix?: string }) {
        return {
            start: () => {
                console.log(`[LOADING] ${message}`);
            },
            update: (msg: string) => {
                console.log(`[UPDATE] ${msg}`);
            },
            stop: () => {
                console.log(`[DONE]`);
            },
        };
    }
}

describe('ZipFileDataSource Integration Tests', () => {
    const logger = new ConsoleLogger();
    const zipExtractor = new ZipExtractor();
    const dataSource = new ZipFileDataSource(zipExtractor, logger);

    test('should ingest real zip file with email files', async () => {
        const zipPath = join(__dirname, '../../../../data/fixtures/test_mylinks.zip');

        const config: FileIngestionConfig = {
            path: zipPath,
        };

        const results = await dataSource.ingest(config);

        // Verify we got results
        expect(results.length).toBeGreaterThan(0);
        console.log(`✅ Ingested ${results.length} email files from zip`);

        // Verify all results are BaseContent with correct source
        results.forEach(content => {
            expect(content.sourceAdapter).toBe('ZipFile');
            expect(content.rawContent).toBeDefined();
            expect(content.rawContent.length).toBeGreaterThan(0);
            expect(content.createdAt).toBeInstanceOf(Date);
            expect(content.updatedAt).toBeInstanceOf(Date);
        });
    });

    test('should extract content from all email files in zip', async () => {
        const zipPath = join(__dirname, '../../../../data/fixtures/test_mylinks.zip');

        const config: FileIngestionConfig = {
            path: zipPath,
        };

        const results = await dataSource.ingest(config);

        // Test a sample to ensure content is actually extracted
        const firstResult = results[0];
        expect(firstResult.rawContent).toBeDefined();
        expect(typeof firstResult.rawContent).toBe('string');
        expect(firstResult.rawContent.length).toBeGreaterThan(100); // Email files should have substantial content

        console.log(`✅ Sample content length: ${firstResult.rawContent.length} characters`);
    });

    test('should extract multiple email files from zip', async () => {
        const zipPath = join(__dirname, '../../../../data/fixtures/test_mylinks.zip');

        const config: FileIngestionConfig = {
            path: zipPath,
        };

        const results = await dataSource.ingest(config);

        // Verify we got multiple files
        expect(results.length).toBeGreaterThan(1);
        console.log(`✅ Extracted ${results.length} files from single zip archive`);

        // Verify all have proper content structure
        results.forEach(content => {
            expect(content.sourceAdapter).toBe('ZipFile');
            expect(content.rawContent).toBeDefined();
            expect(content.rawContent.length).toBeGreaterThan(0);
        });
    });

    test('should preserve file content integrity', async () => {
        const zipPath = join(__dirname, '../../../../data/fixtures/test_mylinks.zip');

        const config: FileIngestionConfig = {
            path: zipPath,
        };

        const results = await dataSource.ingest(config);

        // Verify content is extracted completely and not corrupted
        results.forEach(content => {
            // All email files should have headers
            const hasEmailHeaders =
                content.rawContent.includes('From:') ||
                content.rawContent.includes('Subject:') ||
                content.rawContent.includes('Date:') ||
                content.rawContent.includes('To:');

            expect(hasEmailHeaders).toBe(true);
        });

        console.log(`✅ Content integrity verified for ${results.length} files`);
    });

    test('should set correct timestamps on ingested content', async () => {
        const zipPath = join(__dirname, '../../../../data/fixtures/test_mylinks.zip');

        const config: FileIngestionConfig = {
            path: zipPath,
        };

        const beforeIngest = new Date();
        const results = await dataSource.ingest(config);
        const afterIngest = new Date();

        // All timestamps should be set during ingestion
        results.forEach(content => {
            expect(content.createdAt.getTime()).toBeGreaterThanOrEqual(beforeIngest.getTime());
            expect(content.createdAt.getTime()).toBeLessThanOrEqual(afterIngest.getTime());
            expect(content.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeIngest.getTime());
            expect(content.updatedAt.getTime()).toBeLessThanOrEqual(afterIngest.getTime());
        });

        console.log(`✅ Timestamps correctly set for ${results.length} items`);
    });

    test('should throw error for non-existent zip file', async () => {
        const nonExistentPath = join(__dirname, '../../../../data/fixtures/does-not-exist.zip');

        const config: FileIngestionConfig = {
            path: nonExistentPath,
        };

        // Should throw error during fetchRaw
        await expect(dataSource.ingest(config)).rejects.toThrow();
        console.log(`✅ Correctly throws error for non-existent file`);
    });

    test('should handle each file as separate BaseContent item', async () => {
        const zipPath = join(__dirname, '../../../../data/fixtures/test_mylinks.zip');

        const config: FileIngestionConfig = {
            path: zipPath,
        };

        const results = await dataSource.ingest(config);

        // Each file should be a separate BaseContent item
        expect(results.length).toBeGreaterThan(0);

        // All items should be distinct (different raw content)
        const uniqueContent = new Set(results.map(r => r.rawContent));
        expect(uniqueContent.size).toBe(results.length);

        console.log(`✅ Each of ${results.length} files processed as separate item`);

        // Verify each item has complete structure
        results.forEach(content => {
            expect(content.sourceAdapter).toBe('ZipFile');
            expect(content.url).toBe(content.rawContent);
            expect(content.rawContent).toBeDefined();
            expect(content.rawContent.length).toBeGreaterThan(0);
        });
    });

    test('should normalize content consistently across all files', async () => {
        const zipPath = join(__dirname, '../../../../data/fixtures/test_mylinks.zip');

        const config: FileIngestionConfig = {
            path: zipPath,
        };

        const results = await dataSource.ingest(config);

        // All results should have consistent normalization
        results.forEach(content => {
            // Check BaseContent structure
            expect(content.sourceAdapter).toBe('ZipFile');
            expect(content.tags).toEqual([]); // Initially empty
            expect(content.summary).toBe(''); // Initially empty
            expect(content.url).toBe(content.rawContent); // url field contains raw content
            expect(content.rawContent).toBeDefined();
            expect(content.createdAt).toBeInstanceOf(Date);
            expect(content.updatedAt).toBeInstanceOf(Date);
        });

        console.log(`✅ All ${results.length} items normalized consistently`);
    });

    test('should handle zip with different file types', async () => {
        const zipPath = join(__dirname, '../../../../data/fixtures/test_mylinks.zip');

        const config: FileIngestionConfig = {
            path: zipPath,
        };

        const results = await dataSource.ingest(config);

        // Log the types of files found (by checking content patterns)
        const emailFiles = results.filter(c =>
            c.rawContent.includes('From:') || c.rawContent.includes('Subject:')
        );

        console.log(`✅ Processed ${results.length} total files`);
        console.log(`   - ${emailFiles.length} appear to be email files`);

        expect(results.length).toBeGreaterThan(0);
    });
});

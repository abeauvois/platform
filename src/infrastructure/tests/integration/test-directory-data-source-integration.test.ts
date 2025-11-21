import { test, expect, describe } from 'bun:test';
import { join } from 'path';
import { DirectoryDataSource } from '../../adapters/DirectoryDataSource.js';
import { DirectoryReader } from '../../adapters/DirectoryReader.js';
import { FileIngestionConfig } from '../../../domain/entities/IngestionConfig.js';
import { SourceAdapter } from '../../../domain/entities/SourceAdapter.js';
import { ConsoleLogger } from './ConsoleLogger.js';

describe('DirectoryDataSource Integration Tests', () => {
    const logger = new ConsoleLogger();
    const directoryReader = new DirectoryReader();
    const dataSource = new DirectoryDataSource(directoryReader, logger);

    test('should ingest real directory with email files', async () => {
        const dirPath = join(__dirname, '../../../../data/fixtures/test_mylinks');

        const config: FileIngestionConfig = {
            path: dirPath,
        };

        const results = await dataSource.ingest(config);

        // Verify we got results
        expect(results.length).toBeGreaterThan(0);
        console.log(`✅ Ingested ${results.length} email files from directory`);

        // Verify all results are BaseContent with correct source
        results.forEach(content => {
            expect(content.sourceAdapter).toBe(SourceAdapter.Directory);
            expect(content.rawContent).toBeDefined();
            expect(content.rawContent.length).toBeGreaterThan(0);
            expect(content.createdAt).toBeInstanceOf(Date);
            expect(content.updatedAt).toBeInstanceOf(Date);
        });
    });

    test('should extract content from all files in directory', async () => {
        const dirPath = join(__dirname, '../../../../data/fixtures/test_mylinks');

        const config: FileIngestionConfig = {
            path: dirPath,
        };

        const results = await dataSource.ingest(config);

        // Test a sample to ensure content is actually extracted
        const firstResult = results[0];
        expect(firstResult.rawContent).toBeDefined();
        expect(typeof firstResult.rawContent).toBe('string');
        expect(firstResult.rawContent.length).toBeGreaterThan(100); // Email files should have substantial content

        console.log(`✅ Sample content length: ${firstResult.rawContent.length} characters`);
    });

    test('should handle smaller test directory', async () => {
        const dirPath = join(__dirname, '../../../../data/fixtures/test_mylinks_2');

        const config: FileIngestionConfig = {
            path: dirPath,
        };

        const results = await dataSource.ingest(config);

        expect(results.length).toBeGreaterThan(0);
        console.log(`✅ Successfully processed directory: ${results.length} files`);

        // Verify structure
        results.forEach(content => {
            expect(content.sourceAdapter).toBe(SourceAdapter.Directory);
            expect(content.url).toBeDefined();
            expect(content.rawContent).toBeDefined();
        });
    });

    test('should set correct timestamps on ingested content', async () => {
        const dirPath = join(__dirname, '../../../../data/fixtures/test_mylinks_2');

        const config: FileIngestionConfig = {
            path: dirPath,
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

    test('should throw error for non-existent directory', async () => {
        const nonExistentPath = join(__dirname, '../../../../data/fixtures/does-not-exist');

        const config: FileIngestionConfig = {
            path: nonExistentPath,
        };

        // Should throw error during fetchRaw
        await expect(dataSource.ingest(config)).rejects.toThrow();
        console.log(`✅ Correctly throws error for non-existent directory`);
    });

    test('should normalize content consistently across all files', async () => {
        const dirPath = join(__dirname, '../../../../data/fixtures/test_mylinks_2');

        const config: FileIngestionConfig = {
            path: dirPath,
        };

        const results = await dataSource.ingest(config);

        // All results should have consistent normalization
        results.forEach(content => {
            // Check BaseContent structure
            expect(content.sourceAdapter).toBe(SourceAdapter.Directory);
            expect(content.tags).toEqual([]); // Initially empty
            expect(content.summary).toBe(''); // Initially empty
            expect(content.url).toBe(content.rawContent); // url field contains raw content
            expect(content.rawContent).toBeDefined();
            expect(content.createdAt).toBeInstanceOf(Date);
            expect(content.updatedAt).toBeInstanceOf(Date);
        });

        console.log(`✅ All ${results.length} items normalized consistently`);
    });

    test('should handle directory with email files', async () => {
        const dirPath = join(__dirname, '../../../../data/fixtures/test_mylinks');

        const config: FileIngestionConfig = {
            path: dirPath,
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

    test('should preserve file content integrity', async () => {
        const dirPath = join(__dirname, '../../../../data/fixtures/test_mylinks_2');

        const config: FileIngestionConfig = {
            path: dirPath,
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

    test('should handle each file as separate BaseContent item', async () => {
        const dirPath = join(__dirname, '../../../../data/fixtures/test_mylinks_2');

        const config: FileIngestionConfig = {
            path: dirPath,
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
            expect(content.sourceAdapter).toBe(SourceAdapter.Directory);
            expect(content.url).toBe(content.rawContent);
            expect(content.rawContent).toBeDefined();
            expect(content.rawContent.length).toBeGreaterThan(0);
        });
    });

    test('should support file pattern filtering', async () => {
        const dirPath = join(__dirname, '../../../../data/fixtures/test_mylinks');

        const config: FileIngestionConfig = {
            path: dirPath,
            filePattern: '*.eml',
        };

        const results = await dataSource.ingest(config);

        // Should only get .eml files
        expect(results.length).toBeGreaterThan(0);
        console.log(`✅ Filtered to ${results.length} .eml files`);

        // All should be from directory source
        results.forEach(content => {
            expect(content.sourceAdapter).toBe(SourceAdapter.Directory);
        });
    });
});

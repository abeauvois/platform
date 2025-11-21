import { test, expect, describe } from 'bun:test';
import { join } from 'path';
import { ZipFileDataSource } from '../../adapters/ZipFileDataSource.js';
import { ZipExtractor } from '../../adapters/ZipExtractor.js';
import { CsvParserStage } from '../../workflow/stages/CsvParserStage';
import { SimpleCsvParser } from '../../adapters/SimpleCsvParser';
import { Pipeline } from '../../../domain/workflow/Pipeline.js';
import { FileIngestionConfig } from '../../../domain/entities/IngestionConfig.js';
import { SourceAdapter } from '../../../domain/entities/SourceAdapter.js';
import { ILogger } from '../../../domain/ports/ILogger.js';
import { BaseContent } from '../../../domain/entities/BaseContent.js';

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

describe('CsvParserStage Integration Tests', () => {
    const logger = new ConsoleLogger();
    const zipExtractor = new ZipExtractor();
    const csvParser = new SimpleCsvParser();

    test('should parse CSV file from zip into multiple BaseContent items', async () => {
        // ARRANGE: Extract CSV file from zip using ZipFileDataSource
        const dataSource = new ZipFileDataSource(zipExtractor, logger);
        const zipPath = join(__dirname, '../../../../data/fixtures/test_csv_bookmarks.zip');

        const config: FileIngestionConfig = {
            path: zipPath,
        };

        const extractedContent = await dataSource.ingest(config);

        // Should get 1 BaseContent item (the CSV file as raw content)
        expect(extractedContent.length).toBe(1);
        expect(extractedContent[0].rawContent).toContain('url,tags,summary');

        // ACT: Pass through CsvParserStage
        const csvStage = new CsvParserStage(csvParser);
        const parsedResults: BaseContent[] = [];

        for (const content of extractedContent) {
            for await (const parsed of csvStage.process(content)) {
                parsedResults.push(parsed);
            }
        }

        // ASSERT: Should have 3 BaseContent items (one per CSV row, excluding header)
        expect(parsedResults.length).toBe(3);
        console.log(`✅ Parsed ${parsedResults.length} rows from CSV file`);

        // Verify first row
        const firstRow = parsedResults[0];
        expect(firstRow.url).toBe('https://example.com/typescript-guide');
        expect(firstRow.tags).toEqual(['programming', 'typescript', 'web']);
        expect(firstRow.summary).toBe('Comprehensive guide to TypeScript best practices');
        expect(firstRow.sourceAdapter).toBe('ZipFile');

        // Verify second row
        const secondRow = parsedResults[1];
        expect(secondRow.url).toBe('https://example.com/ml-intro');
        expect(secondRow.tags).toEqual(['ai', 'machine-learning', 'data-science']);
        expect(secondRow.summary).toBe('Introduction to Machine Learning fundamentals');

        // Verify third row
        const thirdRow = parsedResults[2];
        expect(thirdRow.url).toBe('https://example.com/docker-tutorial');
        expect(thirdRow.tags).toEqual(['devops', 'docker', 'containers']);
        expect(thirdRow.summary).toBe('Docker containerization tutorial for beginners');
    });

    test('should pass through non-CSV content unchanged', async () => {
        // ARRANGE: Create a BaseContent that is NOT CSV
        const nonCsvContent = new BaseContent(
            'https://example.com',
            'ZipFile',
            ['test'],
            'Test summary',
            'This is not CSV content, just plain text',
            new Date(),
            new Date()
        );

        // ACT: Pass through CsvParserStage
        const csvStage = new CsvParserStage(csvParser);
        const results: BaseContent[] = [];

        for await (const result of csvStage.process(nonCsvContent)) {
            results.push(result);
        }

        // ASSERT: Should return unchanged
        expect(results.length).toBe(1);
        expect(results[0]).toBe(nonCsvContent);
        console.log(`✅ Non-CSV content passed through unchanged`);
    });

    test('should work in a Pipeline with multiple stages', async () => {
        // ARRANGE: Create a pipeline with CsvParserStage
        const dataSource = new ZipFileDataSource(zipExtractor, logger);
        const zipPath = join(__dirname, '../../../../data/fixtures/test_csv_bookmarks.zip');

        const config: FileIngestionConfig = {
            path: zipPath,
        };

        const extractedContent = await dataSource.ingest(config);

        // ACT: Create pipeline with CSV parser stage
        const pipeline = new Pipeline<BaseContent, BaseContent>()
            .addStage(new CsvParserStage(csvParser));

        const results: BaseContent[] = [];
        for (const content of extractedContent) {
            for await (const result of pipeline.execute(content)) {
                results.push(result);
            }
        }

        // ASSERT: Should have parsed all CSV rows
        expect(results.length).toBe(3);
        expect(results[0].url).toBe('https://example.com/typescript-guide');
        expect(results[1].url).toBe('https://example.com/ml-intro');
        expect(results[2].url).toBe('https://example.com/docker-tutorial');

        console.log(`✅ Pipeline successfully processed ${results.length} CSV rows`);
    });

    test('should handle mixed content zip (CSV + EML files)', async () => {
        // ARRANGE: Create a zip with both CSV and EML files
        // For this test, we'll simulate by processing both types
        const csvContent = new BaseContent(
            'url,tags,summary\nhttps://example.com/test,tag1;tag2,Test summary',
            'ZipFile',
            [],
            '',
            'url,tags,summary\nhttps://example.com/test,tag1;tag2,Test summary',
            new Date(),
            new Date()
        );

        const emlContent = new BaseContent(
            'From: test@example.com\nSubject: Test Email\n\nEmail body',
            'ZipFile',
            [],
            '',
            'From: test@example.com\nSubject: Test Email\n\nEmail body',
            new Date(),
            new Date()
        );

        // ACT: Pass both through CsvParserStage
        const csvStage = new CsvParserStage(csvParser);
        const results: BaseContent[] = [];

        for await (const result of csvStage.process(csvContent)) {
            results.push(result);
        }
        for await (const result of csvStage.process(emlContent)) {
            results.push(result);
        }

        // ASSERT: CSV should be parsed (1 row), EML should pass through unchanged
        expect(results.length).toBe(2);

        // First result is parsed CSV row
        expect(results[0].url).toBe('https://example.com/test');
        expect(results[0].tags).toEqual(['tag1', 'tag2']);

        // Second result is unchanged EML
        expect(results[1].rawContent).toContain('From: test@example.com');

        console.log(`✅ Successfully handled mixed content (CSV + EML)`);
    });

    test('should preserve structured data in rawContent as JSON', async () => {
        // ARRANGE
        const dataSource = new ZipFileDataSource(zipExtractor, logger);
        const zipPath = join(__dirname, '../../../../data/fixtures/test_csv_bookmarks.zip');

        const config: FileIngestionConfig = {
            path: zipPath,
        };

        const extractedContent = await dataSource.ingest(config);

        // ACT
        const csvStage = new CsvParserStage(csvParser);
        const results: BaseContent[] = [];

        for (const content of extractedContent) {
            for await (const parsed of csvStage.process(content)) {
                results.push(parsed);
            }
        }

        // ASSERT: rawContent should contain structured data as JSON
        const firstRow = results[0];
        const parsedRawContent = JSON.parse(firstRow.rawContent);

        expect(parsedRawContent.url).toBe('https://example.com/typescript-guide');
        expect(parsedRawContent.tags).toBe('programming;typescript;web');
        expect(parsedRawContent.summary).toBe('Comprehensive guide to TypeScript best practices');

        console.log(`✅ Structured data preserved as JSON in rawContent`);
    });
});

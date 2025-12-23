import { test, expect, describe } from 'bun:test';
import { join } from 'path';
import { DirectorySourceReader } from '../../../application/source-readers/DirectorySourceReader.js';
import { DirectoryReader } from '../../adapters/DirectoryReader.js';
import { CsvParserStage } from '../../workflow/stages/CsvParserStage';
import { SimpleCsvParser } from '../../adapters/SimpleCsvParser';
import { Pipeline } from '../../../domain/workflow/Pipeline.js';
import { FileIngestionConfig } from '../../../domain/entities/IngestionConfig.js';
import { BaseContent } from '../../../domain/entities/BaseContent.js';
import { ConsoleLogger } from './ConsoleLogger';

const FIXTURES_DIR = join(__dirname, '../fixtures');

describe('CsvParserStage Integration Tests', () => {
    const logger = new ConsoleLogger();
    const directoryReader = new DirectoryReader();
    const csvParser = new SimpleCsvParser();

    test('should parse CSV file from zip into multiple BaseContent items', async () => {
        const sourceReader = new DirectorySourceReader(directoryReader, logger);
        const zipPath = join(FIXTURES_DIR, 'test_csv_bookmarks.zip');

        const config: FileIngestionConfig = {
            path: zipPath,
        };

        const extractedContent = await sourceReader.ingest(config);

        expect(extractedContent.length).toBe(1);
        expect(extractedContent[0].rawContent).toContain('url,tags,summary');

        const csvStage = new CsvParserStage(csvParser);
        const parsedResults: BaseContent[] = [];

        for (const content of extractedContent) {
            for await (const parsed of csvStage.process(content)) {
                parsedResults.push(parsed);
            }
        }

        expect(parsedResults.length).toBe(3);

        const firstRow = parsedResults[0];
        expect(firstRow.url).toBe('https://example.com/typescript-guide');
        expect(firstRow.tags).toEqual(['programming', 'typescript', 'web']);
        expect(firstRow.summary).toBe('Comprehensive guide to TypeScript best practices');
        expect(firstRow.sourceAdapter).toBe('Directory');

        const secondRow = parsedResults[1];
        expect(secondRow.url).toBe('https://example.com/ml-intro');
        expect(secondRow.tags).toEqual(['ai', 'machine-learning', 'data-science']);
        expect(secondRow.summary).toBe('Introduction to Machine Learning fundamentals');

        const thirdRow = parsedResults[2];
        expect(thirdRow.url).toBe('https://example.com/docker-tutorial');
        expect(thirdRow.tags).toEqual(['devops', 'docker', 'containers']);
        expect(thirdRow.summary).toBe('Docker containerization tutorial for beginners');
    });

    test('should pass through non-CSV content unchanged', async () => {
        const nonCsvContent = new BaseContent(
            'https://example.com',
            'ZipFile',
            ['test'],
            'Test summary',
            'This is not CSV content, just plain text',
            new Date(),
            new Date()
        );

        const csvStage = new CsvParserStage(csvParser);
        const results: BaseContent[] = [];

        for await (const result of csvStage.process(nonCsvContent)) {
            results.push(result);
        }

        expect(results.length).toBe(1);
        expect(results[0]).toBe(nonCsvContent);
    });

    test('should work in a Pipeline with multiple stages', async () => {
        const sourceReader = new DirectorySourceReader(directoryReader, logger);
        const zipPath = join(FIXTURES_DIR, 'test_csv_bookmarks.zip');

        const config: FileIngestionConfig = {
            path: zipPath,
        };

        const extractedContent = await sourceReader.ingest(config);

        const pipeline = new Pipeline<BaseContent, BaseContent>()
            .addStage(new CsvParserStage(csvParser));

        const results: BaseContent[] = [];
        for (const content of extractedContent) {
            for await (const result of pipeline.execute(content)) {
                results.push(result);
            }
        }

        expect(results.length).toBe(3);
        expect(results[0].url).toBe('https://example.com/typescript-guide');
        expect(results[1].url).toBe('https://example.com/ml-intro');
        expect(results[2].url).toBe('https://example.com/docker-tutorial');
    });

    test('should handle mixed content zip (CSV + EML files)', async () => {
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

        const csvStage = new CsvParserStage(csvParser);
        const results: BaseContent[] = [];

        for await (const result of csvStage.process(csvContent)) {
            results.push(result);
        }
        for await (const result of csvStage.process(emlContent)) {
            results.push(result);
        }

        expect(results.length).toBe(2);
        expect(results[0].url).toBe('https://example.com/test');
        expect(results[0].tags).toEqual(['tag1', 'tag2']);
        expect(results[1].rawContent).toContain('From: test@example.com');
    });

    test('should preserve structured data in rawContent as JSON', async () => {
        const sourceReader = new DirectorySourceReader(directoryReader, logger);
        const zipPath = join(FIXTURES_DIR, 'test_csv_bookmarks.zip');

        const config: FileIngestionConfig = {
            path: zipPath,
        };

        const extractedContent = await sourceReader.ingest(config);

        const csvStage = new CsvParserStage(csvParser);
        const results: BaseContent[] = [];

        for (const content of extractedContent) {
            for await (const parsed of csvStage.process(content)) {
                results.push(parsed);
            }
        }

        const firstRow = results[0];
        const parsedRawContent = JSON.parse(firstRow.rawContent);

        expect(parsedRawContent.url).toBe('https://example.com/typescript-guide');
        expect(parsedRawContent.tags).toBe('programming;typescript;web');
        expect(parsedRawContent.summary).toBe('Comprehensive guide to TypeScript best practices');
    });
});

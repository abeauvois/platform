import { test, expect, describe, beforeEach } from 'bun:test';
import { ZipFileDataSource } from '../../adapters/ZipFileDataSource';
import { BaseContent } from '../../../domain/entities/BaseContent.js';
import { SourceAdapter } from '../../../domain/entities/SourceAdapter.js';
import { FileIngestionConfig } from '../../../domain/entities/IngestionConfig.js';
import { IZipExtractor } from '../../../domain/ports/IZipExtractor.js';
import { ILogger } from '../../../domain/ports/ILogger.js';

// Mock implementations
class MockZipExtractor implements IZipExtractor {
    private files: Map<string, string> = new Map();

    setFiles(files: Map<string, string>) {
        this.files = files;
    }

    async extractFiles(zipPath: string): Promise<Map<string, string>> {
        return this.files;
    }
}

class MockLogger implements ILogger {
    logs: string[] = [];

    info(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.logs.push(`INFO: ${message}`);
    }

    error(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.logs.push(`ERROR: ${message}`);
    }

    warning(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.logs.push(`WARNING: ${message}`);
    }

    debug(message: string, options?: { prefix?: string; suffix?: string }): void {
        this.logs.push(`DEBUG: ${message}`);
    }

    await(message: string, options?: { prefix?: string; suffix?: string }) {
        return {
            start: () => { },
            update: (msg: string) => { },
            stop: () => { },
        };
    }
}

// Import the class we're testing

describe('ZipFileDataSource', () => {
    let mockZipExtractor: MockZipExtractor;
    let mockLogger: MockLogger;
    let dataSource: ZipFileDataSource;

    beforeEach(() => {
        mockZipExtractor = new MockZipExtractor();
        mockLogger = new MockLogger();
        dataSource = new ZipFileDataSource(
            mockZipExtractor,
            mockLogger
        );
    });

    test('should have ZipFile source type', () => {
        expect(dataSource.getSourceType()).toBe('ZipFile');
    });

    test('should throw error if path is missing', async () => {
        const config: FileIngestionConfig = {
            path: '',
        };

        await expect(dataSource.ingest(config)).rejects.toThrow('path is required');
    });

    test('should fetch and normalize email files from zip', async () => {
        const files = new Map([
            ['email1.eml', 'Content of email 1 with link: https://example.com'],
            ['email2.eml', 'Content of email 2 with link: https://test.com'],
        ]);

        mockZipExtractor.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/archive.zip',
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(2);
        expect(results[0]).toBeInstanceOf(BaseContent);
        expect(results[0].sourceAdapter).toBe('ZipFile');
        expect(results[0].rawContent).toContain('https://example.com');
        expect(results[1].rawContent).toContain('https://test.com');
    });

    test('should handle empty zip file', async () => {
        const files = new Map<string, string>();
        mockZipExtractor.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/empty.zip',
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(0);
    });

    test('should handle single email file', async () => {
        const files = new Map([
            ['single.eml', 'Single email content'],
        ]);

        mockZipExtractor.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/archive.zip',
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(1);
        expect(results[0].sourceAdapter).toBe('ZipFile');
        expect(results[0].rawContent).toBe('Single email content');
    });

    test('should normalize all files with ZipFile source adapter', async () => {
        const files = new Map([
            ['file1.eml', 'Content 1'],
            ['file2.eml', 'Content 2'],
            ['file3.eml', 'Content 3'],
        ]);

        mockZipExtractor.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/archive.zip',
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(3);
        results.forEach((result: BaseContent) => {
            expect(result.sourceAdapter).toBe('ZipFile');
            expect(result.tags).toEqual([]);
            expect(result.summary).toBe('');
        });
    });

    test('should log progress during ingestion', async () => {
        const files = new Map([
            ['email.eml', 'Email content'],
        ]);

        mockZipExtractor.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/archive.zip',
        };

        await dataSource.ingest(config);

        expect(mockLogger.logs.length).toBeGreaterThan(0);
        expect(mockLogger.logs.some(log => log.includes('Fetching data'))).toBe(true);
        expect(mockLogger.logs.some(log => log.includes('Normalizing'))).toBe(true);
        expect(mockLogger.logs.some(log => log.includes('Ingestion complete'))).toBe(true);
    });

    test('should preserve file content during normalization', async () => {
        const testContent = 'This is test email content with special chars: éàü & <html>';
        const files = new Map([
            ['test.eml', testContent],
        ]);

        mockZipExtractor.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/archive.zip',
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(1);
        expect(results[0].rawContent).toBe(testContent);
        expect(results[0].url).toBe(testContent);
    });

    test('should set timestamps on normalized content', async () => {
        const files = new Map([
            ['email.eml', 'Content'],
        ]);

        mockZipExtractor.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/archive.zip',
        };

        const before = new Date();
        const results = await dataSource.ingest(config);
        const after = new Date();

        expect(results).toHaveLength(1);
        expect(results[0].createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(results[0].createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
});

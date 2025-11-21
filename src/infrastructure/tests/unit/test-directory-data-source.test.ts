import { test, expect, describe, beforeEach } from 'bun:test';
import { EmailFile } from '../../../domain/entities/EmailFile.js';
import { BaseContent } from '../../../domain/entities/BaseContent.js';
import { SourceAdapter } from '../../../domain/entities/SourceAdapter.js';
import { FileIngestionConfig } from '../../../domain/entities/IngestionConfig.js';
import { IDirectoryReader } from '../../../domain/ports/IDirectoryReader.js';
import { ILogger } from '../../../domain/ports/ILogger.js';

// Mock implementations
class MockDirectoryReader implements IDirectoryReader {
    private files: Map<string, string> = new Map();

    setFiles(files: Map<string, string>) {
        this.files = files;
    }

    async readFiles(
        directoryPath: string,
        recursive?: boolean,
        filePattern?: string
    ): Promise<Map<string, string>> {
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
import { DirectoryDataSource } from '../../adapters/DirectoryDataSource.js';

describe('DirectoryDataSource', () => {
    let mockDirectoryReader: MockDirectoryReader;
    let mockLogger: MockLogger;
    let dataSource: DirectoryDataSource;

    beforeEach(() => {
        mockDirectoryReader = new MockDirectoryReader();
        mockLogger = new MockLogger();
        dataSource = new DirectoryDataSource(
            mockDirectoryReader,
            mockLogger
        );
    });

    test('should have Directory source type', () => {
        expect(dataSource.getSourceType()).toBe(SourceAdapter.Directory);
    });

    test('should throw error if path is missing', async () => {
        const config: FileIngestionConfig = {
            path: '',
        };

        await expect(dataSource.ingest(config)).rejects.toThrow('path is required');
    });

    test('should fetch and normalize files from directory', async () => {
        const files = new Map([
            ['email1.eml', 'Content of email 1 with link: https://example.com'],
            ['email2.eml', 'Content of email 2 with link: https://test.com'],
        ]);

        mockDirectoryReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(2);
        expect(results[0]).toBeInstanceOf(BaseContent);
        expect(results[0].sourceAdapter).toBe(SourceAdapter.Directory);
        expect(results[0].rawContent).toContain('https://example.com');
        expect(results[1].rawContent).toContain('https://test.com');
    });

    test('should handle empty directory', async () => {
        const files = new Map<string, string>();
        mockDirectoryReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/empty',
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(0);
    });

    test('should handle single file', async () => {
        const files = new Map([
            ['single.eml', 'Single email content'],
        ]);

        mockDirectoryReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(1);
        expect(results[0].sourceAdapter).toBe(SourceAdapter.Directory);
        expect(results[0].rawContent).toBe('Single email content');
    });

    test('should normalize all files with Directory source adapter', async () => {
        const files = new Map([
            ['file1.eml', 'Content 1'],
            ['file2.eml', 'Content 2'],
            ['file3.eml', 'Content 3'],
        ]);

        mockDirectoryReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(3);
        results.forEach((result: BaseContent) => {
            expect(result.sourceAdapter).toBe(SourceAdapter.Directory);
            expect(result.tags).toEqual([]);
            expect(result.summary).toBe('');
        });
    });

    test('should log progress during ingestion', async () => {
        const files = new Map([
            ['email.eml', 'Email content'],
        ]);

        mockDirectoryReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
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

        mockDirectoryReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
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

        mockDirectoryReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
        };

        const before = new Date();
        const results = await dataSource.ingest(config);
        const after = new Date();

        expect(results).toHaveLength(1);
        expect(results[0].createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(results[0].createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    test('should support recursive option', async () => {
        const files = new Map([
            ['dir1/file1.eml', 'Content 1'],
            ['dir2/file2.eml', 'Content 2'],
        ]);

        mockDirectoryReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
            recursive: true,
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(2);
        results.forEach((result: BaseContent) => {
            expect(result.sourceAdapter).toBe(SourceAdapter.Directory);
        });
    });

    test('should support filePattern option', async () => {
        const files = new Map([
            ['file1.eml', 'Content 1'],
            ['file2.txt', 'Content 2'],
        ]);

        mockDirectoryReader.setFiles(files);

        const config: FileIngestionConfig = {
            path: '/path/to/directory',
            filePattern: '*.eml',
        };

        const results = await dataSource.ingest(config);

        // Should only get .eml files
        expect(results).toHaveLength(2);
    });
});

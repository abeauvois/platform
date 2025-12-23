import { describe, test, expect, beforeEach } from 'bun:test';
import { SourceReaderFactory } from '../../factories/SourceReaderFactory.js';
import { SourceAdapter } from '../../../domain/entities/SourceAdapter.js';
import { GmailSourceReader } from '../../../application/source-readers/GmailSourceReader.js';
import { DirectorySourceReader } from '../../../application/source-readers/DirectorySourceReader.js';
import { ILogger } from '../../../domain/ports/ILogger.js';

// Mock logger for testing
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

describe('SourceReaderFactory', () => {
    let mockLogger: MockLogger;

    beforeEach(() => {
        mockLogger = new MockLogger();
    });

    describe('create', () => {
        test('should create GmailSourceReader for Gmail source type', () => {
            const mockTimestampRepo = {
                getLastExecutionTime: async () => null,
                saveLastExecutionTime: async () => { }
            };
            const mockEmailClient = {
                fetchMessagesSince: async () => []
            };

            const sourceReader = SourceReaderFactory.create(
                'Gmail',
                mockLogger,
                { emailClient: mockEmailClient, timestampRepository: mockTimestampRepo }
            );

            expect(sourceReader).toBeInstanceOf(GmailSourceReader);
            expect(sourceReader.getSourceType()).toBe('Gmail');
        });

        test('should create DirectorySourceReader for ZipFile source type', () => {
            const mockDirectoryReader = {
                readFiles: async () => []
            };

            const sourceReader = SourceReaderFactory.create(
                'ZipFile',
                mockLogger,
                { directoryReader: mockDirectoryReader }
            );

            expect(sourceReader).toBeInstanceOf(DirectorySourceReader);
            expect(sourceReader.getSourceType()).toBe('Directory');
        });

        test('should create DirectorySourceReader for Directory source type', () => {
            const mockDirectoryReader = {
                readFiles: async () => []
            };

            const sourceReader = SourceReaderFactory.create(
                'Directory',
                mockLogger,
                { directoryReader: mockDirectoryReader }
            );

            expect(sourceReader).toBeInstanceOf(DirectorySourceReader);
            expect(sourceReader.getSourceType()).toBe('Directory');
        });

        test('should throw error for unsupported source type', () => {
            expect(() => {
                SourceReaderFactory.create(
                    'Outlook' as SourceAdapter,
                    mockLogger,
                    {}
                );
            }).toThrow('Unsupported source adapter: Outlook');
        });

        test('should throw error for None source type', () => {
            expect(() => {
                SourceReaderFactory.create(
                    'None',
                    mockLogger,
                    {}
                );
            }).toThrow('Cannot create source reader for None type');
        });

        test('should throw error when required dependencies are missing', () => {
            expect(() => {
                SourceReaderFactory.create(
                    'Gmail',
                    mockLogger,
                    {} // Missing emailClient and timestampRepository
                );
            }).toThrow('Gmail source reader requires emailClient and timestampRepository');
        });

        test('should create correct instance for each supported type', () => {
            const mockEmailClient = {
                fetchMessagesSince: async () => []
            };
            const mockTimestampRepo = {
                getLastExecutionTime: async () => null,
                saveLastExecutionTime: async () => { }
            };
            const mockDirectoryReader = {
                readFiles: async () => []
            };

            const sources: Array<{ type: SourceAdapter; deps: any; expectedClass: any; expectedSourceType: string }> = [
                {
                    type: 'Gmail',
                    deps: { emailClient: mockEmailClient, timestampRepository: mockTimestampRepo },
                    expectedClass: GmailSourceReader,
                    expectedSourceType: 'Gmail'
                },
                {
                    type: 'ZipFile',
                    deps: { directoryReader: mockDirectoryReader },
                    expectedClass: DirectorySourceReader,
                    expectedSourceType: 'Directory'
                },
                {
                    type: 'Directory',
                    deps: { directoryReader: mockDirectoryReader },
                    expectedClass: DirectorySourceReader,
                    expectedSourceType: 'Directory'
                }
            ];

            sources.forEach(({ type, deps, expectedClass, expectedSourceType }) => {
                const sourceReader = SourceReaderFactory.create(type, mockLogger, deps);
                expect(sourceReader).toBeInstanceOf(expectedClass);
                expect(sourceReader.getSourceType()).toBe(expectedSourceType);
            });
        });
    });

    describe('type safety', () => {
        test('should accept valid SourceAdapter types', () => {
            const validTypes: SourceAdapter[] = ['Gmail', 'ZipFile', 'Directory'];

            validTypes.forEach(type => {
                // Should not throw type error
                const sourceType: SourceAdapter = type;
                expect(sourceType).toBe(type);
            });
        });

        test('should work with type narrowing', () => {
            const unknownType: string = 'Gmail';

            // Type guard would be used here in real code
            const sourceType = unknownType as SourceAdapter;
            expect(sourceType).toBe('Gmail');
        });
    });
});

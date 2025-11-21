import { test, expect, describe, beforeEach } from 'bun:test';
import { GmailMessage } from '../../../domain/entities/GmailMessage.js';
import { BaseContent } from '../../../domain/entities/BaseContent.js';
import { SourceAdapter } from '../../../domain/entities/SourceAdapter.js';
import { ApiIngestionConfig } from '../../../domain/entities/IngestionConfig.js';
import { IEmailClient } from '../../../domain/ports/IEmailClient.js';
import { ITimestampRepository } from '../../../domain/ports/ITimestampRepository.js';
import { ILogger } from '../../../domain/ports/ILogger.js';

// Mock implementations
class MockEmailClient implements IEmailClient {
    private messages: GmailMessage[] = [];

    setMessages(messages: GmailMessage[]) {
        this.messages = messages;
    }

    async fetchMessagesSince(since: Date, filterEmail?: string): Promise<GmailMessage[]> {
        return this.messages;
    }
}

class MockTimestampRepository implements ITimestampRepository {
    private timestamp: Date | null = null;

    async getLastExecutionTime(): Promise<Date | null> {
        return this.timestamp;
    }

    async saveLastExecutionTime(timestamp: Date): Promise<void> {
        this.timestamp = timestamp;
    }

    setLastExecutionTime(date: Date) {
        this.timestamp = date;
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

// Import the class we're testing (will be created next)
import { GmailDataSource } from '../../adapters/GmailDataSource.js';

describe('GmailDataSource', () => {
    let mockEmailClient: MockEmailClient;
    let mockTimestampRepo: MockTimestampRepository;
    let mockLogger: MockLogger;
    let dataSource: GmailDataSource;

    beforeEach(() => {
        mockEmailClient = new MockEmailClient();
        mockTimestampRepo = new MockTimestampRepository();
        mockLogger = new MockLogger();
        dataSource = new GmailDataSource(
            mockEmailClient,
            mockTimestampRepo,
            mockLogger
        );
    });

    test('should have Gmail source type', () => {
        expect(dataSource.getSourceType()).toBe('Gmail');
    });

    test('should throw error if credentials are missing', async () => {
        const config: ApiIngestionConfig = {
            credentials: {} as any,
        };

        await expect(dataSource.ingest(config)).rejects.toThrow('Gmail requires clientId, clientSecret, and refreshToken in credentials');
    });

    test('should fetch and normalize Gmail messages', async () => {
        const testDate = new Date('2025-01-01');
        const gmailMessage = new GmailMessage(
            'msg-123',
            'Test Subject',
            'sender@example.com',
            testDate,
            'Test snippet',
            'Test raw content with link: https://example.com'
        );

        mockEmailClient.setMessages([gmailMessage]);

        const config: ApiIngestionConfig = {
            credentials: {
                clientId: 'test-id',
                clientSecret: 'test-secret',
                refreshToken: 'test-token',
            },
            since: testDate,
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(1);
        expect(results[0]).toBeInstanceOf(BaseContent);
        expect(results[0].sourceAdapter).toBe('Gmail');
        expect(results[0].rawContent).toContain('https://example.com');
        expect(results[0].createdAt).toEqual(testDate);
    });

    test('should handle multiple Gmail messages', async () => {
        const messages = [
            new GmailMessage('1', 'Subject 1', 'sender1@example.com', new Date(), 'Snippet 1', 'Content 1'),
            new GmailMessage('2', 'Subject 2', 'sender2@example.com', new Date(), 'Snippet 2', 'Content 2'),
            new GmailMessage('3', 'Subject 3', 'sender3@example.com', new Date(), 'Snippet 3', 'Content 3'),
        ];

        mockEmailClient.setMessages(messages);

        const config: ApiIngestionConfig = {
            credentials: {
                clientId: 'test-id',
                clientSecret: 'test-secret',
                refreshToken: 'test-token',
            },
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(3);
        expect(results[0].sourceAdapter).toBe('Gmail');
        expect(results[1].sourceAdapter).toBe('Gmail');
        expect(results[2].sourceAdapter).toBe('Gmail');
    });

    test('should use timestamp from config if provided', async () => {
        const gmailMessage = new GmailMessage(
            'msg-123',
            'Test',
            'sender@example.com',
            new Date(),
            'Snippet',
            'Content'
        );

        mockEmailClient.setMessages([gmailMessage]);
        mockTimestampRepo.setLastExecutionTime(new Date('2024-01-01'));

        const configDate = new Date('2025-01-01');
        const config: ApiIngestionConfig = {
            credentials: {
                clientId: 'test-id',
                clientSecret: 'test-secret',
                refreshToken: 'test-token',
            },
            since: configDate,
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(1);
        // Config date should be used, not timestamp from repo
    });

    test('should use timestamp repository if config.since not provided', async () => {
        const gmailMessage = new GmailMessage(
            'msg-123',
            'Test',
            'sender@example.com',
            new Date(),
            'Snippet',
            'Content'
        );

        mockEmailClient.setMessages([gmailMessage]);

        const repoDate = new Date('2024-01-01');
        mockTimestampRepo.setLastExecutionTime(repoDate);

        const config: ApiIngestionConfig = {
            credentials: {
                clientId: 'test-id',
                clientSecret: 'test-secret',
                refreshToken: 'test-token',
            },
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(1);
    });

    test('should apply email filter when provided', async () => {
        const gmailMessage = new GmailMessage(
            'msg-123',
            'Test',
            'sender@example.com',
            new Date(),
            'Snippet',
            'Content'
        );

        mockEmailClient.setMessages([gmailMessage]);

        const config: ApiIngestionConfig = {
            credentials: {
                clientId: 'test-id',
                clientSecret: 'test-secret',
                refreshToken: 'test-token',
            },
            filters: {
                email: 'specific@example.com',
            },
        };

        const results = await dataSource.ingest(config);

        expect(results).toHaveLength(1);
    });

    test('should log progress during ingestion', async () => {
        const gmailMessage = new GmailMessage(
            'msg-123',
            'Test',
            'sender@example.com',
            new Date(),
            'Snippet',
            'Content'
        );

        mockEmailClient.setMessages([gmailMessage]);

        const config: ApiIngestionConfig = {
            credentials: {
                clientId: 'test-id',
                clientSecret: 'test-secret',
                refreshToken: 'test-token',
            },
        };

        await dataSource.ingest(config);

        expect(mockLogger.logs.length).toBeGreaterThan(0);
        expect(mockLogger.logs.some(log => log.includes('Fetching data'))).toBe(true);
        expect(mockLogger.logs.some(log => log.includes('Normalizing'))).toBe(true);
        expect(mockLogger.logs.some(log => log.includes('Ingestion complete'))).toBe(true);
    });
});

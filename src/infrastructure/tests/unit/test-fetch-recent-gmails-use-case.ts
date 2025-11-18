import { test, expect, describe, beforeEach } from 'bun:test';
import { GmailMessage } from '../../../domain/entities/GmailMessage';

/**
 * Unit Tests: FetchRecentGmailsUseCase
 * 
 * Tests the business logic for fetching recent Gmail messages
 * since the last execution time.
 * 
 * Following TDD approach (RED phase - these tests should fail initially)
 */

// Mock implementations for testing
class MockGmailClient {
    private messages: GmailMessage[];

    constructor(messages: GmailMessage[]) {
        this.messages = messages;
    }

    async fetchMessagesSince(timestamp: Date, filterEmail?: string): Promise<GmailMessage[]> {
        let filtered = this.messages.filter(msg => msg.receivedAt > timestamp);

        // Apply sender filter if provided
        if (filterEmail) {
            filtered = filtered.filter(msg =>
                msg.from.toLowerCase().includes(filterEmail.toLowerCase())
            );
        }

        return filtered;
    }
}

class MockTimestampRepository {
    private timestamp: Date | null = null;

    async getLastExecutionTime(): Promise<Date | null> {
        return this.timestamp;
    }

    async saveLastExecutionTime(timestamp: Date): Promise<void> {
        this.timestamp = timestamp;
    }
}

describe('FetchRecentGmailsUseCase', () => {
    let mockGmailClient: MockGmailClient;
    let mockTimestampRepo: MockTimestampRepository;

    beforeEach(() => {
        // Reset mocks before each test
        mockTimestampRepo = new MockTimestampRepository();
    });

    test('should fetch all messages when executed for the first time (no previous timestamp)', async () => {
        // Arrange: Create test messages with recent dates (within last month)
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

        const messages = [
            new GmailMessage(
                '1',
                'Test Subject 1',
                'sender1@example.com',
                threeDaysAgo,
                'Test body 1'
            ),
            new GmailMessage(
                '2',
                'Test Subject 2',
                'sender2@example.com',
                twoDaysAgo,
                'Test body 2'
            )
        ];

        mockGmailClient = new MockGmailClient(messages);

        // This import will fail initially (RED phase)
        const { FetchRecentGmailsUseCase } = await import('../../../application/FetchRecentGmailsUseCase');
        const useCase = new FetchRecentGmailsUseCase(mockGmailClient, mockTimestampRepo);

        // Act: Execute use case
        const result = await useCase.execute();

        // Assert: Should return all messages since no previous timestamp exists
        expect(result.length).toBe(2);
        expect(result[0].subject).toBe('Test Subject 1');
        expect(result[1].subject).toBe('Test Subject 2');
    });

    test('should fetch only messages since last execution time', async () => {
        // Arrange: Set last execution time
        const lastExecutionTime = new Date('2024-01-02T00:00:00Z');
        await mockTimestampRepo.saveLastExecutionTime(lastExecutionTime);

        const messages = [
            new GmailMessage(
                '1',
                'Old Message',
                'sender1@example.com',
                new Date('2024-01-01T10:00:00Z'),
                'Old body'
            ),
            new GmailMessage(
                '2',
                'New Message 1',
                'sender2@example.com',
                new Date('2024-01-03T10:00:00Z'),
                'New body 1'
            ),
            new GmailMessage(
                '3',
                'New Message 2',
                'sender3@example.com',
                new Date('2024-01-04T10:00:00Z'),
                'New body 2'
            )
        ];

        mockGmailClient = new MockGmailClient(messages);

        const { FetchRecentGmailsUseCase } = await import('../../../application/FetchRecentGmailsUseCase');
        const useCase = new FetchRecentGmailsUseCase(mockGmailClient, mockTimestampRepo);

        // Act
        const result = await useCase.execute();

        // Assert: Should only return messages after lastExecutionTime
        expect(result.length).toBe(2);
        expect(result[0].subject).toBe('New Message 1');
        expect(result[1].subject).toBe('New Message 2');
    });

    test('should save current timestamp after execution', async () => {
        // Arrange
        const messages = [
            new GmailMessage(
                '1',
                'Test Subject',
                'sender@example.com',
                new Date('2024-01-01T10:00:00Z'),
                'Test body'
            )
        ];

        mockGmailClient = new MockGmailClient(messages);

        const { FetchRecentGmailsUseCase } = await import('../../../application/FetchRecentGmailsUseCase');
        const useCase = new FetchRecentGmailsUseCase(mockGmailClient, mockTimestampRepo);

        const beforeExecution = new Date();

        // Act
        await useCase.execute();

        // Assert: Should save timestamp after execution
        const savedTimestamp = await mockTimestampRepo.getLastExecutionTime();
        expect(savedTimestamp).not.toBeNull();
        expect(savedTimestamp!.getTime()).toBeGreaterThanOrEqual(beforeExecution.getTime());
    });

    test('should return empty array when no new messages', async () => {
        // Arrange: Set last execution to future date
        const lastExecutionTime = new Date('2025-01-01T00:00:00Z');
        await mockTimestampRepo.saveLastExecutionTime(lastExecutionTime);

        const messages = [
            new GmailMessage(
                '1',
                'Old Message',
                'sender@example.com',
                new Date('2024-01-01T10:00:00Z'),
                'Old body'
            )
        ];

        mockGmailClient = new MockGmailClient(messages);

        const { FetchRecentGmailsUseCase } = await import('../../../application/FetchRecentGmailsUseCase');
        const useCase = new FetchRecentGmailsUseCase(mockGmailClient, mockTimestampRepo);

        // Act
        const result = await useCase.execute();

        // Assert
        expect(result.length).toBe(0);
    });

    test('should handle errors from Gmail client gracefully', async () => {
        // Arrange: Create a failing Gmail client
        class FailingGmailClient {
            async fetchMessagesSince(_timestamp: Date): Promise<GmailMessage[]> {
                throw new Error('Gmail API error');
            }
        }

        const failingClient = new FailingGmailClient();

        const { FetchRecentGmailsUseCase } = await import('../../../application/FetchRecentGmailsUseCase');
        const useCase = new FetchRecentGmailsUseCase(failingClient, mockTimestampRepo);

        // Act & Assert: Should propagate error
        await expect(useCase.execute()).rejects.toThrow('Gmail API error');
    });
});

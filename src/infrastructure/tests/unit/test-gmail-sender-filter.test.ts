import { test, expect, describe } from 'bun:test';
import { GmailMessage } from '../../../domain/entities/GmailMessage.js';
import { FetchRecentGmailsUseCase } from '../../../application/FetchRecentGmailsUseCase.js';

/**
 * Unit Tests: Gmail Sender Filter
 * 
 * Tests filtering Gmail messages by sender email address.
 * Following TDD approach (RED phase - write tests first)
 * 
 * Feature: Filter messages to only show emails from specific sender
 * Use Case: User wants to see only emails they sent to themselves
 */

// Mock Gmail client that supports filtering
class MockGmailClientWithFilter {
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

describe('FetchRecentGmailsUseCase - Sender Filter', () => {
    test('should filter messages by sender email when filterEmail is provided', async () => {
        // Arrange: Create messages from different senders
        const messages = [
            new GmailMessage(
                '1',
                'Email to myself',
                'abeauvois@gmail.com',
                new Date('2024-01-02T10:00:00Z'),
                'My own email'
            ),
            new GmailMessage(
                '2',
                'Newsletter',
                'newsletter@example.com',
                new Date('2024-01-03T10:00:00Z'),
                'Marketing email'
            ),
            new GmailMessage(
                '3',
                'Another email to myself',
                'Alexandre Beauvois <abeauvois@gmail.com>',
                new Date('2024-01-04T10:00:00Z'),
                'Another personal email'
            ),
            new GmailMessage(
                '4',
                'Work email',
                'colleague@company.com',
                new Date('2024-01-05T10:00:00Z'),
                'Work related'
            )
        ];

        const mockGmailClient = new MockGmailClientWithFilter(messages);
        const mockTimestampRepo = new MockTimestampRepository();

        // Set last execution time before all messages
        await mockTimestampRepo.saveLastExecutionTime(new Date('2024-01-01T00:00:00Z'));

        const useCase = new FetchRecentGmailsUseCase(
            mockGmailClient,
            mockTimestampRepo,
            'abeauvois@gmail.com' // Filter by this email
        );

        // Act
        const result = await useCase.execute();

        // Assert: Should only return messages from abeauvois@gmail.com
        expect(result.length).toBe(2);
        expect(result[0].subject).toBe('Email to myself');
        expect(result[0].from).toContain('abeauvois@gmail.com');
        expect(result[1].subject).toBe('Another email to myself');
        expect(result[1].from).toContain('abeauvois@gmail.com');
    });

    test('should return all messages when no filterEmail is provided', async () => {
        // Arrange
        const messages = [
            new GmailMessage(
                '1',
                'Email 1',
                'sender1@example.com',
                new Date('2024-01-02T10:00:00Z'),
                'Body 1'
            ),
            new GmailMessage(
                '2',
                'Email 2',
                'sender2@example.com',
                new Date('2024-01-03T10:00:00Z'),
                'Body 2'
            )
        ];

        const mockGmailClient = new MockGmailClientWithFilter(messages);
        const mockTimestampRepo = new MockTimestampRepository();
        await mockTimestampRepo.saveLastExecutionTime(new Date('2024-01-01T00:00:00Z'));

        // No filter email provided
        const useCase = new FetchRecentGmailsUseCase(
            mockGmailClient,
            mockTimestampRepo
        );

        // Act
        const result = await useCase.execute();

        // Assert: Should return all messages
        expect(result.length).toBe(2);
    });

    test('should return empty array when no messages match the sender filter', async () => {
        // Arrange
        const messages = [
            new GmailMessage(
                '1',
                'Email 1',
                'other@example.com',
                new Date('2024-01-02T10:00:00Z'),
                'Body 1'
            ),
            new GmailMessage(
                '2',
                'Email 2',
                'another@example.com',
                new Date('2024-01-03T10:00:00Z'),
                'Body 2'
            )
        ];

        const mockGmailClient = new MockGmailClientWithFilter(messages);
        const mockTimestampRepo = new MockTimestampRepository();
        await mockTimestampRepo.saveLastExecutionTime(new Date('2024-01-01T00:00:00Z'));

        const useCase = new FetchRecentGmailsUseCase(
            mockGmailClient,
            mockTimestampRepo,
            'nonexistent@gmail.com'
        );

        // Act
        const result = await useCase.execute();

        // Assert: Should return empty array
        expect(result.length).toBe(0);
    });

    test('should handle sender email with display name format', async () => {
        // Arrange: Test "Display Name <email@example.com>" format
        const messages = [
            new GmailMessage(
                '1',
                'Test',
                'Alexandre Beauvois <abeauvois@gmail.com>',
                new Date('2024-01-02T10:00:00Z'),
                'Body'
            ),
            new GmailMessage(
                '2',
                'Test 2',
                'Other Person <other@example.com>',
                new Date('2024-01-03T10:00:00Z'),
                'Body 2'
            )
        ];

        const mockGmailClient = new MockGmailClientWithFilter(messages);
        const mockTimestampRepo = new MockTimestampRepository();
        await mockTimestampRepo.saveLastExecutionTime(new Date('2024-01-01T00:00:00Z'));

        const useCase = new FetchRecentGmailsUseCase(
            mockGmailClient,
            mockTimestampRepo,
            'abeauvois@gmail.com'
        );

        // Act
        const result = await useCase.execute();

        // Assert: Should match even with display name
        expect(result.length).toBe(1);
        expect(result[0].from).toContain('abeauvois@gmail.com');
    });
});

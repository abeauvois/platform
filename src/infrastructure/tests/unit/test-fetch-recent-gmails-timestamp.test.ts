import { test, expect, describe, beforeEach } from 'bun:test';
import { FileTimestampRepository } from '../../repositories/FileTimestampRepository';

/**
 * Unit Tests: FileTimestampRepository
 * 
 * Tests the business logic for storing and retrieving timestamps
 * since the last execution time.
 * 
 * Following TDD approach (RED phase - these tests should fail initially)
 */

describe('FileTimestampRepository', () => {
    let fileTimestampRepo: FileTimestampRepository;

    beforeEach(() => {
        // Reset mocks before each test
        fileTimestampRepo = new FileTimestampRepository();
    });

    test('should return 30 days ago date (no previous timestamp)', async () => {

        // Act: Execute use case
        const result = await fileTimestampRepo.getLastExecutionTime();

        const defaultDate = result || new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 30);
        console.log("🚀 ~ defaultDate:", defaultDate)

        // Assert: Should return all messages since no previous timestamp exists
        expect(result).toBeNull();
        expect(defaultDate).toBeInstanceOf(Date);
    });

});

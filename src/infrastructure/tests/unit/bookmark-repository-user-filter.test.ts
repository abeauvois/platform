import { test, expect, beforeEach } from 'bun:test';
import { InMemoryBookmarkRepository } from '../../repositories/InMemoryBookmarkRepository.js';
import { Bookmark } from '../../../domain/entities/Bookmark.js';

/**
 * Test suite for user-specific bookmark filtering in InMemoryBookmarkRepository
 * Tests the findByUserId method following TDD approach
 */

let repository: InMemoryBookmarkRepository;

beforeEach(async () => {
    repository = new InMemoryBookmarkRepository();
    await repository.clear();
});

test('findByUserId should return empty array when no bookmarks exist', async () => {
    const bookmarks = await repository.findByUserId('user-123');
    expect(bookmarks).toEqual([]);
});

test('findByUserId should return only bookmarks for specific user', async () => {
    // Arrange: Create bookmarks for different users
    const bookmark1 = new Bookmark('https://example.com/1', 'EmlFile', [], '', '', new Date(), new Date(), 'unknown', 'user-123');
    const bookmark2 = new Bookmark('https://example.com/2', 'EmlFile', [], '', '', new Date(), new Date(), 'unknown', 'user-123');
    const bookmark3 = new Bookmark('https://example.com/3', 'EmlFile', [], '', '', new Date(), new Date(), 'unknown', 'user-456');

    await repository.save(bookmark1);
    await repository.save(bookmark2);
    await repository.save(bookmark3);

    // Act: Get bookmarks for user-123
    const user123Bookmarks = await repository.findByUserId('user-123');

    // Assert: Should only return bookmarks for user-123
    expect(user123Bookmarks).toHaveLength(2);
    expect(user123Bookmarks.every(b => b.userId === 'user-123')).toBe(true);
    expect(user123Bookmarks.map(b => b.url)).toContain('https://example.com/1');
    expect(user123Bookmarks.map(b => b.url)).toContain('https://example.com/2');
    expect(user123Bookmarks.map(b => b.url)).not.toContain('https://example.com/3');
});

test('findByUserId should return empty array for non-existent user', async () => {
    // Arrange
    const bookmark = new Bookmark('https://example.com/1', 'EmlFile', [], '', '', new Date(), new Date(), 'unknown', 'user-123');
    await repository.save(bookmark);

    // Act
    const bookmarks = await repository.findByUserId('non-existent-user');

    // Assert
    expect(bookmarks).toEqual([]);
});

test('findByUserId should handle undefined userId gracefully', async () => {
    // Arrange
    const bookmarkWithUser = new Bookmark('https://example.com/1', 'EmlFile', [], '', '', new Date(), new Date(), 'unknown', 'user-123');
    const bookmarkWithoutUser = new Bookmark('https://example.com/2', 'EmlFile', [], '', '', new Date(), new Date());

    await repository.save(bookmarkWithUser);
    await repository.save(bookmarkWithoutUser);

    // Act
    const bookmarks = await repository.findByUserId('user-123');

    // Assert
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].url).toBe('https://example.com/1');
});

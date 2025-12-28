/**
 * Unit Tests: InMemoryBookmarkRepository
 * Tests the in-memory bookmark repository implementation
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { Bookmark } from '@platform/platform-domain';
import { InMemoryBookmarkRepository } from '../InMemoryBookmarkRepository';

describe('InMemoryBookmarkRepository', () => {
    let repository: InMemoryBookmarkRepository;

    beforeEach(() => {
        repository = new InMemoryBookmarkRepository();
    });

    describe('save', () => {
        test('should save a bookmark and return it with generated id', async () => {
            const bookmark = new Bookmark(
                'https://example.com',
                'Gmail',
                ['tech'],
                'Example site',
                'Raw content here',
                new Date(),
                new Date(),
                'article',
                'user-123'
            );

            const saved = await repository.save(bookmark);

            expect(saved.url).toBe('https://example.com');
            expect(saved.id).toBeDefined();
            expect(saved.id).toContain('bookmark-');
        });

        test('should preserve existing id if provided', async () => {
            const bookmark = new Bookmark(
                'https://example.com',
                'Gmail',
                ['tech'],
                'Example site',
                'Raw content',
                new Date(),
                new Date(),
                'article',
                'user-123',
                'existing-id'
            );

            const saved = await repository.save(bookmark);

            expect(saved.id).toBe('existing-id');
        });
    });

    describe('exists', () => {
        test('should return true for existing bookmark URL', async () => {
            const bookmark = new Bookmark('https://example.com', 'Gmail');
            await repository.save(bookmark);

            const exists = await repository.exists('https://example.com');

            expect(exists).toBe(true);
        });

        test('should return false for non-existing bookmark URL', async () => {
            const exists = await repository.exists('https://nonexistent.com');

            expect(exists).toBe(false);
        });
    });

    describe('findByUrl', () => {
        test('should find bookmark by URL', async () => {
            const bookmark = new Bookmark('https://example.com', 'Gmail', ['tech']);
            await repository.save(bookmark);

            const found = await repository.findByUrl('https://example.com');

            expect(found).not.toBeNull();
            expect(found?.url).toBe('https://example.com');
            expect(found?.tags).toEqual(['tech']);
        });

        test('should return null for non-existing URL', async () => {
            const found = await repository.findByUrl('https://nonexistent.com');

            expect(found).toBeNull();
        });
    });

    describe('findById', () => {
        test('should find bookmark by id', async () => {
            const bookmark = new Bookmark(
                'https://example.com',
                'Gmail',
                [],
                '',
                '',
                new Date(),
                new Date(),
                'unknown',
                'user-123',
                'test-id'
            );
            await repository.save(bookmark);

            const found = await repository.findById('test-id');

            expect(found).not.toBeNull();
            expect(found?.id).toBe('test-id');
        });

        test('should return null for non-existing id', async () => {
            const found = await repository.findById('nonexistent-id');

            expect(found).toBeNull();
        });
    });

    describe('saveMany', () => {
        test('should save multiple bookmarks', async () => {
            const bookmarks = [
                new Bookmark('https://example1.com', 'Gmail'),
                new Bookmark('https://example2.com', 'Gmail'),
            ];

            const saved = await repository.saveMany(bookmarks);

            expect(saved).toHaveLength(2);
            expect(saved[0].url).toBe('https://example1.com');
            expect(saved[1].url).toBe('https://example2.com');
        });

        test('should return empty array for empty input', async () => {
            const saved = await repository.saveMany([]);

            expect(saved).toEqual([]);
        });
    });

    describe('update', () => {
        test('should update bookmark if owned by user', async () => {
            const bookmark = new Bookmark(
                'https://example.com',
                'Gmail',
                ['old-tag'],
                'Old summary',
                '',
                new Date(),
                new Date(),
                'article',
                'user-123',
                'bookmark-1'
            );
            await repository.save(bookmark);

            const updated = await repository.update('bookmark-1', 'user-123', {
                tags: ['new-tag'],
                summary: 'New summary',
            });

            expect(updated).not.toBeNull();
            expect(updated?.tags).toEqual(['new-tag']);
            expect(updated?.summary).toBe('New summary');
        });

        test('should return null if not owned by user', async () => {
            const bookmark = new Bookmark(
                'https://example.com',
                'Gmail',
                [],
                '',
                '',
                new Date(),
                new Date(),
                'article',
                'user-123',
                'bookmark-1'
            );
            await repository.save(bookmark);

            const updated = await repository.update('bookmark-1', 'different-user', {
                summary: 'Hacked',
            });

            expect(updated).toBeNull();
        });

        test('should return null for non-existing bookmark', async () => {
            const updated = await repository.update('nonexistent', 'user-123', {
                summary: 'Update',
            });

            expect(updated).toBeNull();
        });
    });

    describe('delete', () => {
        test('should delete bookmark if owned by user', async () => {
            const bookmark = new Bookmark(
                'https://example.com',
                'Gmail',
                [],
                '',
                '',
                new Date(),
                new Date(),
                'article',
                'user-123',
                'bookmark-1'
            );
            await repository.save(bookmark);

            const deleted = await repository.delete('bookmark-1', 'user-123');

            expect(deleted).toBe(true);
            expect(await repository.findById('bookmark-1')).toBeNull();
        });

        test('should return false if not owned by user', async () => {
            const bookmark = new Bookmark(
                'https://example.com',
                'Gmail',
                [],
                '',
                '',
                new Date(),
                new Date(),
                'article',
                'user-123',
                'bookmark-1'
            );
            await repository.save(bookmark);

            const deleted = await repository.delete('bookmark-1', 'different-user');

            expect(deleted).toBe(false);
            expect(await repository.findById('bookmark-1')).not.toBeNull();
        });
    });

    describe('findAll', () => {
        test('should return all bookmarks', async () => {
            await repository.save(new Bookmark('https://example1.com', 'Gmail'));
            await repository.save(new Bookmark('https://example2.com', 'Gmail'));

            const all = await repository.findAll();

            expect(all).toHaveLength(2);
        });

        test('should return empty array when no bookmarks', async () => {
            const all = await repository.findAll();

            expect(all).toEqual([]);
        });
    });

    describe('findByUserId', () => {
        test('should return bookmarks for specific user', async () => {
            await repository.save(
                new Bookmark('https://example1.com', 'Gmail', [], '', '', new Date(), new Date(), 'article', 'user-1')
            );
            await repository.save(
                new Bookmark('https://example2.com', 'Gmail', [], '', '', new Date(), new Date(), 'article', 'user-2')
            );
            await repository.save(
                new Bookmark('https://example3.com', 'Gmail', [], '', '', new Date(), new Date(), 'article', 'user-1')
            );

            const user1Bookmarks = await repository.findByUserId('user-1');

            expect(user1Bookmarks).toHaveLength(2);
            expect(user1Bookmarks.every(b => b.userId === 'user-1')).toBe(true);
        });
    });

    describe('clear', () => {
        test('should remove all bookmarks', async () => {
            await repository.save(new Bookmark('https://example1.com', 'Gmail'));
            await repository.save(new Bookmark('https://example2.com', 'Gmail'));

            await repository.clear();

            expect(await repository.findAll()).toEqual([]);
            expect(repository.getCount()).toBe(0);
        });
    });

    describe('getCount', () => {
        test('should return correct count of bookmarks', async () => {
            expect(repository.getCount()).toBe(0);

            await repository.save(new Bookmark('https://example1.com', 'Gmail'));
            expect(repository.getCount()).toBe(1);

            await repository.save(new Bookmark('https://example2.com', 'Gmail'));
            expect(repository.getCount()).toBe(2);
        });
    });
});

import { describe, test, expect } from 'bun:test';
import { toBookmark, toPendingContent, toBaseContent } from '../converters';
import { BaseContent, Bookmark, PendingContent } from '@abeauvois/platform-domain';

describe('converters', () => {
    const createMockBaseContent = (overrides: Partial<BaseContent> = {}): BaseContent => {
        return new BaseContent(
            overrides.url ?? 'https://example.com/article',
            overrides.sourceAdapter ?? 'Gmail',
            overrides.tags ?? ['tech', 'ai'],
            overrides.summary ?? 'An article about AI',
            overrides.rawContent ?? 'Full article content here...',
            overrides.createdAt ?? new Date('2024-01-15T10:00:00Z'),
            overrides.updatedAt ?? new Date('2024-01-15T12:00:00Z'),
            overrides.contentType ?? 'article'
        );
    };

    describe('toBookmark', () => {
        test('should convert BaseContent to Bookmark with all fields', () => {
            const item = createMockBaseContent();
            const userId = 'user-123';

            const bookmark = toBookmark(item, userId);

            expect(bookmark).toBeInstanceOf(Bookmark);
            expect(bookmark.url).toBe('https://example.com/article');
            expect(bookmark.userId).toBe('user-123');
            expect(bookmark.sourceAdapter).toBe('Gmail');
            expect(bookmark.tags).toEqual(['tech', 'ai']);
            expect(bookmark.summary).toBe('An article about AI');
            expect(bookmark.rawContent).toBe('Full article content here...');
            expect(bookmark.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'));
            expect(bookmark.updatedAt).toEqual(new Date('2024-01-15T12:00:00Z'));
            expect(bookmark.contentType).toBe('article');
        });

        test('should handle empty tags', () => {
            const item = createMockBaseContent({ tags: [] });
            const bookmark = toBookmark(item, 'user-123');

            expect(bookmark.tags).toEqual([]);
        });

        test('should handle empty summary and content', () => {
            const item = createMockBaseContent({ summary: '', rawContent: '' });
            const bookmark = toBookmark(item, 'user-123');

            expect(bookmark.summary).toBe('');
            expect(bookmark.rawContent).toBe('');
        });
    });

    describe('toPendingContent', () => {
        test('should convert BaseContent to PendingContent with all fields', () => {
            const item = createMockBaseContent();
            const userId = 'user-456';

            const pending = toPendingContent(item, userId);

            expect(pending).toBeInstanceOf(PendingContent);
            expect(pending.url).toBe('https://example.com/article');
            expect(pending.sourceAdapter).toBe('Gmail');
            expect(pending.rawContent).toBe('Full article content here...');
            expect(pending.contentType).toBe('article');
            expect(pending.status).toBe('pending');
            expect(pending.userId).toBe('user-456');
            expect(pending.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'));
            expect(pending.updatedAt).toEqual(new Date('2024-01-15T12:00:00Z'));
        });

        test('should include externalId when provided', () => {
            const item = createMockBaseContent();
            const pending = toPendingContent(item, 'user-456', 'external-id-789');

            expect(pending.externalId).toBe('external-id-789');
        });

        test('should have undefined externalId when not provided', () => {
            const item = createMockBaseContent();
            const pending = toPendingContent(item, 'user-456');

            expect(pending.externalId).toBeUndefined();
        });
    });

    describe('toBaseContent', () => {
        test('should convert Bookmark back to BaseContent', () => {
            const bookmark = new Bookmark(
                'https://example.com/bookmark',
                'user-789',
                'Other',
                ['social', 'news'],
                'A post about news',
                'Post content...',
                new Date('2024-02-01T08:00:00Z'),
                new Date('2024-02-01T09:00:00Z'),
                'article'
            );

            const baseContent = toBaseContent(bookmark);

            expect(baseContent).toBeInstanceOf(BaseContent);
            expect(baseContent.url).toBe('https://example.com/bookmark');
            expect(baseContent.sourceAdapter).toBe('Other');
            expect(baseContent.tags).toEqual(['social', 'news']);
            expect(baseContent.summary).toBe('A post about news');
            expect(baseContent.rawContent).toBe('Post content...');
            expect(baseContent.createdAt).toEqual(new Date('2024-02-01T08:00:00Z'));
            expect(baseContent.updatedAt).toEqual(new Date('2024-02-01T09:00:00Z'));
            expect(baseContent.contentType).toBe('article');
        });

        test('should handle empty fields', () => {
            const bookmark = new Bookmark(
                'https://example.com',
                'user-1',
                'Other',
                [],
                '',
                '',
                new Date(),
                new Date(),
                'unknown'
            );

            const baseContent = toBaseContent(bookmark);

            expect(baseContent.tags).toEqual([]);
            expect(baseContent.summary).toBe('');
            expect(baseContent.rawContent).toBe('');
        });
    });

    describe('round-trip conversions', () => {
        test('BaseContent -> Bookmark -> BaseContent should preserve data', () => {
            const original = createMockBaseContent();
            const bookmark = toBookmark(original, 'user-123');
            const converted = toBaseContent(bookmark);

            expect(converted.url).toBe(original.url);
            expect(converted.sourceAdapter).toBe(original.sourceAdapter);
            expect(converted.tags).toEqual(original.tags);
            expect(converted.summary).toBe(original.summary);
            expect(converted.rawContent).toBe(original.rawContent);
            expect(converted.createdAt).toEqual(original.createdAt);
            expect(converted.updatedAt).toEqual(original.updatedAt);
            expect(converted.contentType).toBe(original.contentType);
        });
    });
});

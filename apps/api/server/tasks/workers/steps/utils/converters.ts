import { BaseContent, Bookmark, PendingContent } from '@abeauvois/platform-domain';

/**
 * Convert a BaseContent item to a Bookmark.
 * Used by SaveToBookmarkStep and BookmarkEnrichmentStep.
 */
export function toBookmark(item: BaseContent, userId: string): Bookmark {
    return new Bookmark(
        item.url,
        userId,
        item.sourceAdapter,
        item.tags,
        item.summary,
        item.rawContent,
        item.createdAt,
        item.updatedAt,
        item.contentType
    );
}

/**
 * Convert a BaseContent item to PendingContent.
 * Used by SaveToPendingContentStep.
 */
export function toPendingContent(
    item: BaseContent,
    userId: string,
    externalId?: string
): PendingContent {
    return new PendingContent(
        item.url,
        item.sourceAdapter,
        item.rawContent,
        item.contentType,
        'pending',
        userId,
        undefined,
        externalId,
        item.createdAt,
        item.updatedAt
    );
}

/**
 * Convert a Bookmark back to BaseContent.
 * Used by BookmarkEnrichmentStep when returning enriched items.
 */
export function toBaseContent(bookmark: Bookmark): BaseContent {
    return new BaseContent(
        bookmark.url,
        bookmark.sourceAdapter,
        bookmark.tags,
        bookmark.summary,
        bookmark.rawContent,
        bookmark.createdAt,
        bookmark.updatedAt,
        bookmark.contentType
    );
}

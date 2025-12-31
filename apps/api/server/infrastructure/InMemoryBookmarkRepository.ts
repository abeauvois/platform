import { Bookmark, ILinkRepository } from '@platform/platform-domain'

/**
 * In-Memory Implementation of ILinkRepository for Bookmark entities
 * Useful for testing and development without external dependencies
 */
export class InMemoryBookmarkRepository implements ILinkRepository {
    private links: Map<string, Bookmark> = new Map();
    private idCounter: number = 0;

    async exists(url: string): Promise<boolean> {
        return this.links.has(url);
    }

    async findByUrl(url: string): Promise<Bookmark | null> {
        return this.links.get(url) || null;
    }

    async findById(id: string): Promise<Bookmark | null> {
        return Array.from(this.links.values()).find(bookmark => bookmark.id === id) || null;
    }

    async save(link: Bookmark): Promise<Bookmark> {
        // Generate ID if not present
        const id = link.id || `bookmark-${++this.idCounter}`;
        const bookmarkWithId = new Bookmark(
            link.url,
            link.userId,
            link.sourceAdapter,
            link.tags,
            link.summary,
            link.rawContent,
            link.createdAt,
            link.updatedAt,
            link.contentType,
            id
        );
        this.links.set(bookmarkWithId.url, bookmarkWithId);
        return bookmarkWithId;
    }

    async saveMany(links: Bookmark[]): Promise<Bookmark[]> {
        const saved: Bookmark[] = [];
        for (const link of links) {
            const savedLink = await this.save(link);
            saved.push(savedLink);
        }
        return saved;
    }

    async update(id: string, userId: string, updates: Partial<Bookmark>): Promise<Bookmark | null> {
        const bookmark = await this.findById(id);
        if (!bookmark || bookmark.userId !== userId) {
            return null;
        }

        const updated = new Bookmark(
            updates.url ?? bookmark.url,
            bookmark.userId,
            updates.sourceAdapter ?? bookmark.sourceAdapter,
            updates.tags ?? bookmark.tags,
            updates.summary ?? bookmark.summary,
            updates.rawContent ?? bookmark.rawContent,
            bookmark.createdAt,
            new Date(),
            updates.contentType ?? bookmark.contentType,
            bookmark.id
        );

        this.links.set(updated.url, updated);
        return updated;
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const bookmark = await this.findById(id);
        if (!bookmark || bookmark.userId !== userId) {
            return false;
        }
        this.links.delete(bookmark.url);
        return true;
    }

    async findAll(): Promise<Bookmark[]> {
        return Array.from(this.links.values());
    }

    async findByUserId(userId: string): Promise<Bookmark[]> {
        return Array.from(this.links.values()).filter(
            bookmark => bookmark.userId === userId
        );
    }

    async clear(): Promise<void> {
        this.links.clear();
    }

    async existsByUrls(userId: string, urls: string[]): Promise<Set<string>> {
        const existingUrls = Array.from(this.links.values())
            .filter((bookmark) => bookmark.userId === userId && urls.includes(bookmark.url))
            .map((bookmark) => bookmark.url);
        return new Set(existingUrls);
    }

    /**
     * Get the count of stored links (useful for testing)
     */
    getCount(): number {
        return this.links.size;
    }
}

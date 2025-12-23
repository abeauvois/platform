import { Bookmark } from '../../domain/entities/Bookmark.js';
/**
 * In-Memory Implementation of ILinkRepository for Bookmark entities
 * Useful for testing and development without external dependencies
 */
export class InMemoryBookmarkRepository {
    links = new Map();
    idCounter = 0;
    async exists(url) {
        return this.links.has(url);
    }
    async findByUrl(url) {
        return this.links.get(url) || null;
    }
    async findById(id) {
        return Array.from(this.links.values()).find(bookmark => bookmark.id === id) || null;
    }
    async save(link) {
        // Generate ID if not present
        const id = link.id || `bookmark-${++this.idCounter}`;
        const bookmarkWithId = new Bookmark(link.url, link.sourceAdapter, link.tags, link.summary, link.rawContent, link.createdAt, link.updatedAt, link.contentType, link.userId, id);
        this.links.set(bookmarkWithId.url, bookmarkWithId);
        return bookmarkWithId;
    }
    async saveMany(links) {
        const saved = [];
        for (const link of links) {
            const savedLink = await this.save(link);
            saved.push(savedLink);
        }
        return saved;
    }
    async update(id, userId, updates) {
        const bookmark = await this.findById(id);
        if (!bookmark || bookmark.userId !== userId) {
            return null;
        }
        const updated = new Bookmark(updates.url ?? bookmark.url, updates.sourceAdapter ?? bookmark.sourceAdapter, updates.tags ?? bookmark.tags, updates.summary ?? bookmark.summary, updates.rawContent ?? bookmark.rawContent, bookmark.createdAt, new Date(), updates.contentType ?? bookmark.contentType, bookmark.userId, bookmark.id);
        this.links.set(updated.url, updated);
        return updated;
    }
    async delete(id, userId) {
        const bookmark = await this.findById(id);
        if (!bookmark || bookmark.userId !== userId) {
            return false;
        }
        this.links.delete(bookmark.url);
        return true;
    }
    async findAll() {
        return Array.from(this.links.values());
    }
    async findByUserId(userId) {
        return Array.from(this.links.values()).filter(bookmark => bookmark.userId === userId);
    }
    async clear() {
        this.links.clear();
    }
    /**
     * Get the count of stored links (useful for testing)
     */
    getCount() {
        return this.links.size;
    }
}

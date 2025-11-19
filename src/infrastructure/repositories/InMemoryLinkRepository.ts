import { Bookmark } from '../../domain/entities/Bookmark.js';
import { ILinkRepository } from '../../domain/ports/ILinkRepository.js';

/**
 * In-Memory Implementation of ILinkRepository
 * Useful for testing and development without external dependencies
 */
export class InMemoryLinkRepository implements ILinkRepository {
    private links: Map<string, Bookmark> = new Map();

    async exists(url: string): Promise<boolean> {
        return this.links.has(url);
    }

    async findByUrl(url: string): Promise<Bookmark | null> {
        return this.links.get(url) || null;
    }

    async save(link: Bookmark): Promise<void> {
        this.links.set(link.url, link);
    }

    async saveMany(links: Bookmark[]): Promise<void> {
        for (const link of links) {
            await this.save(link);
        }
    }

    async findAll(): Promise<Bookmark[]> {
        return Array.from(this.links.values());
    }

    async clear(): Promise<void> {
        this.links.clear();
    }

    /**
     * Get the count of stored links (useful for testing)
     */
    getCount(): number {
        return this.links.size;
    }
}

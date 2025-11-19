import { IConsumer } from '../../../domain/workflow/IConsumer.js';
import { Bookmark } from '../../../domain/entities/Bookmark.js';
import { ILogger } from '../../../domain/ports/ILogger.js';

/**
 * Consumer: Collects Bookmark objects and logs them
 */
export class BookmarkCollector implements IConsumer<Bookmark> {
    private Bookmarks: Bookmark[] = [];

    constructor(
        private readonly logger: ILogger
    ) { }

    async onStart(): Promise<void> {
        this.Bookmarks = [];
        this.logger.info('\n🔍 Parsing emails and extracting links...');
    }

    async consume(Bookmark: Bookmark): Promise<void> {
        this.Bookmarks.push(Bookmark);
        this.logger.info(` 📧 ${Bookmark.summary.slice(0, 180)}`);
        this.logger.info(`   🔗 ${Bookmark.url.slice(0, 100)}`);
    }

    async onComplete(): Promise<void> {
        this.logger.info(`\n✅ Extracted ${this.Bookmarks.length} links`);
    }

    /**
     * Get all collected email links
     */
    getBookmarks(): Bookmark[] {
        return [...this.Bookmarks];
    }
}

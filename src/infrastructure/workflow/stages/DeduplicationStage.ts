import { IStage } from '../../../domain/workflow/IStage.js';
import { Bookmark } from '../../../domain/entities/Bookmark.js';
import { ILinkRepository } from '../../../domain/ports/ILinkRepository.js';
import { ILogger } from '../../../domain/ports/ILogger.js';

/**
 * Workflow Stage: Filters out duplicate links by checking against a repository
 * Returns empty array for duplicates, single-item array for unique links
 */
export class DeduplicationStage implements IStage<Bookmark, Bookmark> {
    private duplicateCount = 0;

    constructor(
        private readonly repository: ILinkRepository,
        private readonly logger: ILogger
    ) { }

    async *process(link: Bookmark): AsyncIterable<Bookmark> {
        const exists = await this.repository.exists(link.url);

        if (exists) {
            this.duplicateCount++;
            this.logger.debug(`  ⏭️  Skipping duplicate: ${link.url}`);
            return; // Filter out duplicate (yield nothing)
        }

        // Save to repository so future links are checked against it
        await this.repository.save(link);

        yield link; // Pass through unique link
    }

    /**
     * Get the count of duplicates found
     */
    getDuplicateCount(): number {
        return this.duplicateCount;
    }

    /**
     * Reset the duplicate counter
     */
    resetCount(): void {
        this.duplicateCount = 0;
    }
}

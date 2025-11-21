import { IStage } from '../../../domain/workflow/IStage.js';
import { BaseContent } from '../../../domain/entities/BaseContent.js';

/**
 * Workflow Stage: Filters out duplicate BaseContent items by URL
 * Uses in-memory Set for deduplication within a single workflow execution
 */
export class BaseContentDeduplicationStage implements IStage<BaseContent, BaseContent> {
    private seenUrls = new Set<string>();
    private duplicateCount = 0;

    async *process(content: BaseContent): AsyncIterable<BaseContent> {
        // Check if we've seen this URL before
        if (this.seenUrls.has(content.url)) {
            this.duplicateCount++;
            return; // Filter out duplicate (yield nothing)
        }

        // Mark URL as seen
        this.seenUrls.add(content.url);

        yield content; // Pass through unique content
    }

    /**
     * Get the count of duplicates found
     */
    getDuplicateCount(): number {
        return this.duplicateCount;
    }

    /**
     * Reset the deduplication state
     */
    reset(): void {
        this.seenUrls.clear();
        this.duplicateCount = 0;
    }
}

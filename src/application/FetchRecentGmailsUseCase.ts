import { GmailMessage } from '../domain/entities/GmailMessage.js';
import { GmailFetchWorkflowService } from './services/GmailFetchWorkflowService.js';

/**
 * Use Case: FetchRecentGmailsUseCase
 * 
 * Fetches Gmail messages received since the last execution using workflow pattern.
 * Tracks the execution timestamp to enable incremental fetching.
 * 
 * Business Logic:
 * 1. Retrieve last execution timestamp (handled by producer)
 * 2. If no timestamp exists (first run), fetch from 30 days ago
 * 3. Fetch messages since that timestamp via workflow
 * 4. Save current timestamp for next execution (handled by producer)
 * 5. Return fetched messages
 * 
 * Architecture:
 * This use case delegates to GmailFetchWorkflowService which orchestrates:
 * - Producer: GmailMessageProducer (fetches from API)
 * - Pipeline: Empty (no transformation)
 * - Consumer: GmailMessageCollector (collects results)
 */

export class FetchRecentGmailsUseCase {
    constructor(
        private readonly workflowService: GmailFetchWorkflowService
    ) { }

    /**
     * Execute the use case
     * @returns Array of Gmail messages received since last execution
     */
    async execute(): Promise<GmailMessage[]> {
        return await this.workflowService.fetchRecentMessages();
    }
}

import { GmailMessage } from '../domain/entities/GmailMessage.js';
import { IGmailClient } from '../domain/ports/IGmailClient.js';
import { ITimestampRepository } from '../domain/ports/ITimestampRepository.js';

/**
 * Use Case: FetchRecentGmailsUseCase
 * 
 * Fetches Gmail messages received since the last execution.
 * Tracks the execution timestamp to enable incremental fetching.
 * 
 * Business Logic:
 * 1. Retrieve last execution timestamp
 * 2. If no timestamp exists (first run), fetch from beginning of time
 * 3. Fetch messages since that timestamp
 * 4. Save current timestamp for next execution
 * 5. Return fetched messages
 */

export class FetchRecentGmailsUseCase {
    constructor(
        private readonly gmailClient: IGmailClient,
        private readonly timestampRepository: ITimestampRepository,
        private readonly filterEmail?: string
    ) { }

    /**
     * Execute the use case
     * @returns Array of Gmail messages received since last execution
     */
    async execute(): Promise<GmailMessage[]> {
        // Get last execution time
        const lastExecutionTime = await this.timestampRepository.getLastExecutionTime();

        // Determine the "since" timestamp
        // If first run, use epoch (beginning of time)
        const sinceTimestamp = lastExecutionTime || new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 30); // 1 month ago

        // Fetch messages from Gmail with optional sender filter
        const messages = await this.gmailClient.fetchMessagesSince(sinceTimestamp, this.filterEmail);

        // Save current execution time for next run
        const now = new Date();
        await this.timestampRepository.saveLastExecutionTime(now);

        return messages;
    }
}

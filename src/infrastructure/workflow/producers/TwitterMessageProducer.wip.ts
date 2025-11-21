import { TwitterMessage } from '../../../domain/entities/TwitterMessage.wip.js';
import { ITwitterClient } from '../../../domain/ports/ITwitterClient.js';
import { IProducer } from '../../../domain/workflow/IProducer.js';

/**
 * Producer: Fetches Twitter messages from Twitter API
 * Produces TwitterMessage items for the workflow pipeline
 */
export class TwitterMessageProducer implements IProducer<TwitterMessage> {
    constructor(
        private readonly twitterClient: ITwitterClient,
        // private readonly timestampRepository: ITimestampRepository,
        // private readonly filterUsername?: string
    ) { }

    async *produce(): AsyncGenerator<TwitterMessage> {
        // Get last execution time
        // const lastExecutionTime = await this.timestampRepository.getLastExecutionTime(sourceAdapter.twitter);

        // Determine the "since" timestamp
        // If first run, use 30 days ago as default
        // const sinceTimestamp = lastExecutionTime || new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 30);

        // Fetch messages from Twitter with optional sender filter
        const messages = await this.twitterClient.fetchTweetContent(url)

        // Yield each message to the workflow
        for (const message of messages) {
            yield message;
        }

        // Save current execution time after successful fetch
        const now = new Date();
        await this.timestampRepository.saveLastExecutionTime(now);
    }
}

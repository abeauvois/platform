import type { ILogger } from '@abeauvois/platform-core';
import { BaseContent } from '../../domain/entities/BaseContent.js';
import type { ISourceReader, SourceReaderConfig } from '../../domain/ports/ISourceReader.js';
import { GmailApiClient } from './GmailApiClient.js';
import { InMemoryTimestampRepository } from '../InMemoryTimestampRepository.js';
import { UrlExtractor } from '../UrlExtractor.js';

// Singleton timestamp repository to persist state across jobs
const gmailTimestampRepo = new InMemoryTimestampRepository('gmail');
const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

/**
 * Create a Gmail source reader that fetches real Gmail messages
 */
export function createGmailSourceReader(logger: ILogger): ISourceReader | undefined {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        logger.warning(
            'Gmail credentials not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN'
        );
        return undefined;
    }

    const gmailClient = new GmailApiClient({
        clientId,
        clientSecret,
        refreshToken,
    });

    return {
        async read(config: SourceReaderConfig): Promise<Array<BaseContent>> {
            logger.info('Fetching Gmail messages...');

            // Calculate since timestamp
            let sinceDate: Date;
            const lastExecution = await gmailTimestampRepo.getLastExecutionTime();

            if (config.filter?.limitDays) {
                sinceDate = new Date(Date.now() - config.filter.limitDays * DAY_MILLISECONDS);
            } else if (lastExecution) {
                sinceDate = lastExecution;
            } else {
                // Default: last 7 days for first run
                sinceDate = new Date(Date.now() - 7 * DAY_MILLISECONDS);
            }

            logger.info(`Fetching messages since ${sinceDate.toISOString()}`);

            const messages = await gmailClient.fetchMessagesSince(
                sinceDate,
                config.filter?.email,
                config.filter?.withUrl
            );

            messages.forEach((b) => logger.debug(`Converted message to base content: ${b.subject}`));

            logger.info(`Found ${messages.length} Gmail messages \n`);

            // Save current timestamp for next run
            await gmailTimestampRepo.saveLastExecutionTime(new Date());

            const today = new Date(Date.now());
            const urlExtractor = new UrlExtractor();

            // Convert GmailMessage to BaseContent
            const baseContents = messages.map(
                (message) =>
                    new BaseContent(
                        urlExtractor.extractFirst(message.rawContent) || message.id,
                        'Gmail',
                        [],
                        message.subject,
                        message.rawContent,
                        today,
                        today,
                        'email'
                    )
            );

            return baseContents;
        },
    };
}

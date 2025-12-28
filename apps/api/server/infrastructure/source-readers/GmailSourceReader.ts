import { BaseContent, type ILogger, type ISourceReader, type SourceReaderConfig } from '@platform/platform-domain';
import { truncateText } from '@platform/utils';
import { GmailApiClient } from '../GmailApiClient';
import { InMemoryTimestampRepository } from '../InMemoryTimestampRepository';

// Singleton timestamp repository to persist state across jobs
const gmailTimestampRepo = new InMemoryTimestampRepository('gmail');

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
        async read(config: SourceReaderConfig): Promise<BaseContent[]> {
            logger.info('Fetching Gmail messages...');

            // Calculate since timestamp
            let sinceDate: Date;
            const lastExecution = await gmailTimestampRepo.getLastExecutionTime();

            if (config.filter?.limitDays) {
                sinceDate = new Date(Date.now() - config.filter.limitDays * 24 * 60 * 60 * 1000);
            } else if (lastExecution) {
                sinceDate = lastExecution;
            } else {
                // Default: last 7 days for first run
                sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            }

            logger.info(`Fetching messages since ${sinceDate.toISOString()}`);

            const messages = await gmailClient.fetchMessagesSince(
                sinceDate,
                config.filter?.email,
                config.filter?.withUrl
            );

            logger.info(`Found ${messages.length} Gmail messages`);
            logger.info(messages.map((m) => truncateText(m.rawContent, 380)).join('\n'));
            logger.info('\n');

            // Save current timestamp for next run
            await gmailTimestampRepo.saveLastExecutionTime(new Date());

            const today = new Date(Date.now());

            // Convert GmailMessage to BaseContent
            return messages.map(
                (message) =>
                    new BaseContent(
                        message.rawContent || message.snippet,
                        'Gmail',
                        [],
                        message.subject,
                        message.rawContent,
                        today,
                        today,
                        'email'
                    )
            );
        },
    };
}

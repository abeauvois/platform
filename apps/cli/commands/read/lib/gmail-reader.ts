import type { IProgressReporter } from '../../../lib/progress-reporter.js';
import type { SourceContentItem } from '@platform/sdk';

/**
 * Options for reading Gmail
 */
export interface GmailReadOptions {
	email?: string;
	limitDays: number;
	withUrl: boolean;
}

/**
 * API client interface for Gmail reading (port)
 */
export interface IGmailApiClient {
	sources: {
		readGmail(options: {
			email?: string;
			limitDays?: number;
			withUrl?: boolean;
		}): Promise<Array<SourceContentItem>>;
	};
}

/**
 * Display Gmail read configuration
 */
export function displayGmailConfig(
	options: GmailReadOptions,
	reporter: IProgressReporter
): void {
	const configLines: Array<string> = [];

	if (options.email) {
		configLines.push(`Filter: ${options.email}`);
	}
	configLines.push(`Limit: ${options.limitDays} days`);
	if (options.withUrl) {
		configLines.push('Only emails with URLs');
	}

	reporter.note(configLines.join('\n'), 'Configuration');
}

/**
 * Read Gmail messages via API
 */
export async function readGmailMessages(
	apiClient: IGmailApiClient,
	options: GmailReadOptions,
	reporter: IProgressReporter
): Promise<Array<SourceContentItem>> {
	reporter.start('Fetching Gmail messages...');

	const items = await apiClient.sources.readGmail({
		email: options.email,
		limitDays: options.limitDays,
		withUrl: options.withUrl,
	});

	reporter.stop(`Found ${items.length} messages`);

	return items;
}

/**
 * Display Gmail read results
 */
export function displayGmailResults(
	items: Array<SourceContentItem>,
	reporter: IProgressReporter,
	truncate: (text: string, maxLength: number) => string
): void {
	if (items.length === 0) {
		reporter.info('No messages found matching criteria.');
	} else {
		for (const item of items) {
			reporter.note(truncate(item.rawContent, 300), '');
		}
	}
}

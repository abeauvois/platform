import {
    BaseContent,
    type ILogger,
    type ISourceReader,
    type IWorkflowStep,
    type SourceReaderConfig,
} from '@platform/platform-domain';
import { GmailApiClient } from '../../infrastructure/GmailApiClient';
import { InMemoryTimestampRepository } from '../../infrastructure/InMemoryTimestampRepository';
import { truncateText } from '@platform/utils';
import type { IngestRequest } from '../../validators/ingest.validator';
import { ExtractStep, AnalyzeStep, EnrichStep, ExportStep } from './workflow.steps';

// Singleton timestamp repository to persist state across jobs
const gmailTimestampRepo = new InMemoryTimestampRepository('gmail');

/**
 * Configuration for creating workflow steps
 */
export interface StepFactoryConfig {
    logger: ILogger;
    filter?: IngestRequest['filter'];
    skipAnalysis?: boolean;
    skipTwitter?: boolean;
    csvOnly?: boolean;
    sourceReader?: ISourceReader;
}

/**
 * Preset configuration defines how each preset behaves
 */
export interface PresetConfig {
    name: string;
    createSourceReader: (logger: ILogger) => ISourceReader | undefined;
    createSteps: (config: StepFactoryConfig) => IWorkflowStep<BaseContent>[];
}

/**
 * Create a Gmail source reader that fetches real Gmail messages
 */
function createGmailSourceReader(logger: ILogger): ISourceReader | undefined {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        logger.warning('Gmail credentials not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN');
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
            logger.info(messages.map(m => truncateText(m.rawContent, 380)).join('\n'));
            logger.info('\n');

            // Save current timestamp for next run
            await gmailTimestampRepo.saveLastExecutionTime(new Date());

            // Convert GmailMessage to BaseContent
            return messages.map(message => new BaseContent(
                message.rawContent || message.snippet,
                'Gmail',
                [],
                message.subject,
                message.rawContent,
                message.receivedAt,
                message.receivedAt,
                'email'
            ));
        },
    };
}

/**
 * Create default workflow steps based on configuration
 */
function createDefaultSteps(config: StepFactoryConfig): IWorkflowStep<BaseContent>[] {
    const steps: IWorkflowStep<BaseContent>[] = [];

    // Extract step is always required
    steps.push(new ExtractStep('default', config.filter, config.logger, config.sourceReader));

    // Conditional analysis step
    if (!config.skipAnalysis) {
        steps.push(new AnalyzeStep(config.logger));
    }

    // Conditional enrichment step
    if (!config.skipTwitter) {
        steps.push(new EnrichStep(config.logger));
    }

    // Export step is always added
    steps.push(new ExportStep(config.csvOnly ?? false, config.logger));

    return steps;
}

/**
 * Registry of all available presets
 */
export const presets: Record<IngestRequest['preset'], PresetConfig> = {
    gmail: {
        name: 'gmail',
        createSourceReader: createGmailSourceReader,
        createSteps: (config) => {
            const steps: IWorkflowStep<BaseContent>[] = [];
            steps.push(new ExtractStep('gmail', config.filter, config.logger, config.sourceReader));
            if (!config.skipAnalysis) steps.push(new AnalyzeStep(config.logger));
            if (!config.skipTwitter) steps.push(new EnrichStep(config.logger));
            steps.push(new ExportStep(config.csvOnly ?? false, config.logger));
            return steps;
        },
    },

    full: {
        name: 'full',
        createSourceReader: () => undefined, // Uses sample data or throws
        createSteps: createDefaultSteps,
    },

    quick: {
        name: 'quick',
        createSourceReader: () => undefined,
        createSteps: (config) => {
            // Quick preset skips enrichment
            const steps: IWorkflowStep<BaseContent>[] = [];
            steps.push(new ExtractStep('quick', config.filter, config.logger, config.sourceReader));
            if (!config.skipAnalysis) steps.push(new AnalyzeStep(config.logger));
            steps.push(new ExportStep(config.csvOnly ?? false, config.logger));
            return steps;
        },
    },

    analyzeOnly: {
        name: 'analyzeOnly',
        createSourceReader: () => undefined,
        createSteps: (config) => {
            // Only extract and analyze, no export
            const steps: IWorkflowStep<BaseContent>[] = [];
            steps.push(new ExtractStep('analyzeOnly', config.filter, config.logger, config.sourceReader));
            steps.push(new AnalyzeStep(config.logger));
            return steps;
        },
    },

    twitterFocus: {
        name: 'twitterFocus',
        createSourceReader: () => undefined,
        createSteps: (config) => {
            // Always include enrichment for Twitter focus
            const steps: IWorkflowStep<BaseContent>[] = [];
            steps.push(new ExtractStep('twitterFocus', config.filter, config.logger, config.sourceReader));
            if (!config.skipAnalysis) steps.push(new AnalyzeStep(config.logger));
            steps.push(new EnrichStep(config.logger)); // Always enrich for Twitter
            steps.push(new ExportStep(config.csvOnly ?? false, config.logger));
            return steps;
        },
    },

    csvOnly: {
        name: 'csvOnly',
        createSourceReader: () => undefined,
        createSteps: (config) => {
            const steps: IWorkflowStep<BaseContent>[] = [];
            steps.push(new ExtractStep('csvOnly', config.filter, config.logger, config.sourceReader));
            if (!config.skipAnalysis) steps.push(new AnalyzeStep(config.logger));
            if (!config.skipTwitter) steps.push(new EnrichStep(config.logger));
            steps.push(new ExportStep(true, config.logger)); // Force CSV only
            return steps;
        },
    },
};

/**
 * Get preset configuration by name
 */
export function getPreset(name: IngestRequest['preset']): PresetConfig {
    const preset = presets[name];
    if (!preset) {
        throw new Error(`Unknown preset: ${name}`);
    }
    return preset;
}

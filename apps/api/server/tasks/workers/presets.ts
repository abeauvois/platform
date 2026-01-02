import { createBookmarkSourceReader, createGmailSourceReader } from '../../infrastructure/source-readers';
import { createPendingContentSourceReader } from '../../infrastructure/source-readers/PendingContentSourceReader';
import { DrizzleBookmarkRepository } from '../../infrastructure/DrizzleBookmarkRepository';
import { DrizzlePendingContentRepository } from '../../infrastructure/DrizzlePendingContentRepository';
import { WebScraperAdapter } from '../../infrastructure/WebScraperAdapter';
import { BookmarkEnricherAdapter } from '../../infrastructure/BookmarkEnricherAdapter';
import { AnalyzeStep, BookmarkEnrichmentStep, EnrichStep, ExportStep, ReadStep, SaveToPendingContentStep } from './steps';
import type { BaseContent, ILogger, ISourceReader, IWorkflowStep } from '@platform/platform-domain';
import type { SAVE_TO_DESTINATIONS, WorkflowRequest } from '@/validators/workflow.validator';

/**
 * SaveTo destination type
 */
export type SaveToDestination = typeof SAVE_TO_DESTINATIONS[number];

/**
 * Configuration for creating workflow steps
 */
export interface StepFactoryConfig {
    logger: ILogger;
    preset: WorkflowRequest['preset'];
    filter?: WorkflowRequest['filter'];
    skipAnalysis?: boolean;
    skipTwitter?: boolean;
    csvOnly?: boolean;
    saveTo?: SaveToDestination;
    sourceReader?: ISourceReader;
    userId?: string;
}

/**
 * Preset configuration defines how each preset behaves
 */
export interface PresetConfig {
    name: string;
    createSourceReader: (logger: ILogger) => ISourceReader | undefined;
    createSteps: (config: StepFactoryConfig) => Array<IWorkflowStep<BaseContent>>;
}

/**
 * Registry of all available presets
 */
export const presets: Record<WorkflowRequest['preset'], PresetConfig> = {
    gmail: {
        name: 'gmail',
        createSourceReader: createGmailSourceReader,
        createSteps: (config) => {
            const steps: Array<IWorkflowStep<BaseContent>> = [];
            steps.push(new ReadStep(config));
            if (!config.skipAnalysis) steps.push(new AnalyzeStep(config));

            // Handle saveTo destinations
            if (config.saveTo === 'database') {
                // Save to pending_content for later enrichment
                const pendingContentRepository = new DrizzlePendingContentRepository();
                steps.push(new SaveToPendingContentStep(config, pendingContentRepository));
            } else if (!config.saveTo) {
                steps.push(new ExportStep(config));
            }
            return steps;
        },
    },

    bookmark: {
        name: 'bookmark',
        createSourceReader: createBookmarkSourceReader,
        createSteps: (config) => {
            const steps: Array<IWorkflowStep<BaseContent>> = [];
            steps.push(new ReadStep(config));
            if (!config.skipAnalysis) steps.push(new AnalyzeStep(config));
            if (!config.skipTwitter) steps.push(new EnrichStep(config));
            return steps;
        },
    },

    analyzeOnly: {
        name: 'analyzeOnly',
        createSourceReader: () => undefined,
        createSteps: (config) => {
            // Only extract and analyze, no export
            const steps: Array<IWorkflowStep<BaseContent>> = [];
            steps.push(new ReadStep(config));
            steps.push(new AnalyzeStep(config));
            return steps;
        },
    },

    twitterFocus: {
        name: 'twitterFocus',
        createSourceReader: () => undefined,
        createSteps: (config) => {
            // Always include enrichment for Twitter focus
            const steps: Array<IWorkflowStep<BaseContent>> = [];
            steps.push(new ReadStep(config));
            if (!config.skipAnalysis) steps.push(new AnalyzeStep(config));
            steps.push(new EnrichStep(config)); // Always enrich for Twitter
            steps.push(new ExportStep(config));
            return steps;
        },
    },

    csvOnly: {
        name: 'csvOnly',
        createSourceReader: () => undefined,
        createSteps: (config) => {
            const steps: Array<IWorkflowStep<BaseContent>> = [];
            steps.push(new ReadStep(config));
            steps.push(new ExportStep({ ...config, csvOnly: true })); // Force CSV only
            return steps;
        },
    },

    bookmarkEnrichment: {
        name: 'bookmarkEnrichment',
        createSourceReader: createPendingContentSourceReader,
        createSteps: (config) => {
            const steps: Array<IWorkflowStep<BaseContent>> = [];

            // Read pending content from database
            steps.push(new ReadStep(config));

            // Enrich: scrape URLs, extract links, analyze content, create bookmarks
            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
                config.logger.error('ANTHROPIC_API_KEY not configured for bookmark enrichment');
                return steps;
            }

            const webScraper = new WebScraperAdapter(config.logger);
            const bookmarkEnricher = new BookmarkEnricherAdapter(apiKey, config.logger);
            const pendingContentRepository = new DrizzlePendingContentRepository();
            const bookmarkRepository = new DrizzleBookmarkRepository();

            steps.push(
                new BookmarkEnrichmentStep(
                    config,
                    webScraper,
                    bookmarkEnricher,
                    pendingContentRepository,
                    bookmarkRepository
                )
            );

            return steps;
        },
    },
};

/**
 * Get preset configuration by name
 */
export function getPreset(name: WorkflowRequest['preset']): PresetConfig {
    const preset = presets[name];
    return preset;
}

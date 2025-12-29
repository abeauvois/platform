import { BaseContent, type ILogger, type ISourceReader, type IWorkflowStep } from '@platform/platform-domain';
import { createGmailSourceReader, createBookmarkSourceReader } from '../../infrastructure/source-readers';
import { DrizzleBookmarkRepository } from '../../infrastructure/DrizzleBookmarkRepository';
import { ReadStep, AnalyzeStep, EnrichStep, ExportStep, SaveToDatabaseStep } from './workflow.steps';
import { WorkflowRequest, SAVE_TO_DESTINATIONS } from '@/validators/workflow.validator';

/**
 * SaveTo destination type
 */
export type SaveToDestination = typeof SAVE_TO_DESTINATIONS[number];

/**
 * Configuration for creating workflow steps
 */
export interface StepFactoryConfig {
    logger: ILogger;
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
    createSteps: (config: StepFactoryConfig) => IWorkflowStep<BaseContent>[];
}

/**
 * Registry of all available presets
 */
export const presets: Record<WorkflowRequest['preset'], PresetConfig> = {
    gmail: {
        name: 'gmail',
        createSourceReader: createGmailSourceReader,
        createSteps: (config) => {
            const steps: IWorkflowStep<BaseContent>[] = [];
            steps.push(new ReadStep('gmail', config.filter, config.logger, config.sourceReader));
            if (!config.skipAnalysis) steps.push(new AnalyzeStep(config.logger));

            // Handle saveTo destinations
            if (config.saveTo === 'database') {
                const bookmarkRepository = new DrizzleBookmarkRepository();
                steps.push(new SaveToDatabaseStep(config.userId!, config.logger, bookmarkRepository));
            } else if (!config.saveTo) {
                steps.push(new ExportStep(false, config.logger));
            }
            return steps;
        },
    },

    bookmark: {
        name: 'bookmark',
        createSourceReader: createBookmarkSourceReader,
        createSteps: (config) => {
            const steps: IWorkflowStep<BaseContent>[] = [];
            steps.push(new ReadStep('bookmark', config.filter, config.logger, config.sourceReader));
            if (!config.skipAnalysis) steps.push(new AnalyzeStep(config.logger));
            if (!config.skipTwitter) steps.push(new EnrichStep(config.logger));
            // steps.push(new ExportStep(config.csvOnly ?? false, config.logger));
            return steps;
        },
    },

    analyzeOnly: {
        name: 'analyzeOnly',
        createSourceReader: () => undefined,
        createSteps: (config) => {
            // Only extract and analyze, no export
            const steps: IWorkflowStep<BaseContent>[] = [];
            steps.push(new ReadStep('analyzeOnly', config.filter, config.logger, config.sourceReader));
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
            steps.push(new ReadStep('twitterFocus', config.filter, config.logger, config.sourceReader));
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
            steps.push(new ReadStep('csvOnly', config.filter, config.logger, config.sourceReader));
            steps.push(new ExportStep(true, config.logger)); // Force CSV only
            return steps;
        },
    },
};

/**
 * Get preset configuration by name
 */
export function getPreset(name: WorkflowRequest['preset']): PresetConfig {
    const preset = presets[name];
    if (!preset) {
        throw new Error(`Unknown preset: ${name}`);
    }
    return preset;
}

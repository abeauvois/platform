import { BaseContent, type ILogger, type ISourceReader, type IWorkflowStep } from '@platform/platform-domain';
import { createGmailSourceReader, createBookmarkSourceReader } from '../../infrastructure/source-readers';
import type { IngestRequest } from '../../validators/ingest.validator';
import { ReadStep, AnalyzeStep, EnrichStep, ExportStep } from './workflow.steps';

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
 * Create default workflow steps based on configuration
 */
function createDefaultSteps(config: StepFactoryConfig): IWorkflowStep<BaseContent>[] {
    const steps: IWorkflowStep<BaseContent>[] = [];

    // Extract step is always required
    steps.push(new ReadStep('default', config.filter, config.logger, config.sourceReader));

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
            steps.push(new ReadStep('gmail', config.filter, config.logger, config.sourceReader));
            if (!config.skipAnalysis) steps.push(new AnalyzeStep(config.logger));
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

    full: {
        name: 'full',
        createSourceReader: () => undefined, // Uses sample data or throws
        createSteps: createDefaultSteps,
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
export function getPreset(name: IngestRequest['preset']): PresetConfig {
    const preset = presets[name];
    if (!preset) {
        throw new Error(`Unknown preset: ${name}`);
    }
    return preset;
}

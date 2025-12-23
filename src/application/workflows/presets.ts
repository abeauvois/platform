import { Bookmark } from '../../domain/entities/Bookmark';
import { IWorkflow } from './WorkflowBuilder';
import { LinkExtractionBuilder, LinkExtractionDependencies } from './LinkExtractionBuilder';

/**
 * Pre-configured workflow presets for common use cases
 */
export const WorkflowPresets = {
    /**
     * Full workflow: Extract → Analyze → Twitter Enrich → Retry → Export (CSV + Notion)
     * Use when you want comprehensive link analysis with all enrichments
     */
    full: (deps: LinkExtractionDependencies): IWorkflow<Bookmark> =>
        new LinkExtractionBuilder(deps)
            .extract()
            .analyze()
            .enrichTwitter()
            .withRetry()
            .exportTo({ csv: true, notion: true })
            .build(),

    /**
     * Quick workflow: Extract → Export (CSV only)
     * Use when you just want to extract links without AI analysis
     * Fastest option - skips all AI processing
     */
    quick: (deps: LinkExtractionDependencies): IWorkflow<Bookmark> =>
        new LinkExtractionBuilder(deps)
            .extract()
            .exportTo({ csv: true, notion: false })
            .build(),

    /**
     * Analyze only workflow: Extract → Analyze → Export
     * Use when you want AI analysis but don't need Twitter enrichment
     * Good for non-Twitter heavy link sources
     */
    analyzeOnly: (deps: LinkExtractionDependencies): IWorkflow<Bookmark> =>
        new LinkExtractionBuilder(deps)
            .extract()
            .analyze()
            .exportTo({ csv: true, notion: true })
            .build(),

    /**
     * Twitter focus workflow: Extract → Twitter Enrich → Retry → Export
     * Use when you primarily have Twitter links and want tweet content
     * Skips general AI analysis, focuses on Twitter API enrichment
     */
    twitterFocus: (deps: LinkExtractionDependencies): IWorkflow<Bookmark> =>
        new LinkExtractionBuilder(deps)
            .extract()
            .enrichTwitter()
            .withRetry()
            .exportTo({ csv: true, notion: true })
            .build(),

    /**
     * CSV only workflow: Extract → Analyze → Export (CSV only)
     * Use when you don't have Notion configured or just want a CSV file
     */
    csvOnly: (deps: LinkExtractionDependencies): IWorkflow<Bookmark> =>
        new LinkExtractionBuilder(deps)
            .extract()
            .analyze()
            .exportTo({ csv: true, notion: false })
            .build(),
} as const;

/**
 * Type for preset names
 */
export type WorkflowPresetName = keyof typeof WorkflowPresets;

/**
 * Get a workflow by preset name
 */
export function getPresetWorkflow(
    name: WorkflowPresetName,
    deps: LinkExtractionDependencies
): IWorkflow<Bookmark> {
    return WorkflowPresets[name](deps);
}

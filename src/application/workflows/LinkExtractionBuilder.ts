import { Bookmark } from '../../domain/entities/Bookmark';
import { IContentAnalyser } from '../../domain/ports/IContentAnalyser';
import { ILogger } from '../../domain/ports/ILogger';
import { ITwitterClient } from '../../domain/ports/ITwitterClient';
import { ExportService } from '../services/ExportService';
import { RetryHandlerService } from '../services/RetryHandlerService';
import { ZipEmlFilesBookmarksWorkflowService } from '../services/ZipEmlFilesBookmarksWorkflowService';
import { WorkflowBuilder, IWorkflow } from './WorkflowBuilder';
import {
    ExtractionStep,
    AnalysisStep,
    TwitterEnrichmentStep,
    RetryStep,
    ExportStep,
    ExportStepOptions,
} from './steps';

/**
 * Dependencies needed to build link extraction workflows
 */
export interface LinkExtractionDependencies {
    extractionService: ZipEmlFilesBookmarksWorkflowService;
    linkAnalyzer: IContentAnalyser;
    tweetClient: ITwitterClient;
    retryHandler: RetryHandlerService;
    exportService: ExportService;
    logger: ILogger;
}

/**
 * Specialized workflow builder for link extraction from emails
 * Extends the generic WorkflowBuilder with convenience methods for common steps
 *
 * @example
 * ```typescript
 * const workflow = new LinkExtractionBuilder(deps)
 *     .extract()
 *     .analyze()
 *     .enrichTwitter()
 *     .withRetry()
 *     .exportTo({ csv: true, notion: true })
 *     .build();
 *
 * await workflow.execute(inputPath, outputPath);
 * ```
 */
export class LinkExtractionBuilder extends WorkflowBuilder<Bookmark> {
    constructor(private readonly deps: LinkExtractionDependencies) {
        super(deps.logger);
    }

    /**
     * Add extraction step - extracts bookmarks from email files
     */
    extract(): this {
        this.steps.push(new ExtractionStep(this.deps.extractionService, this.deps.logger));
        return this;
    }

    /**
     * Add analysis step - analyzes links with AI
     */
    analyze(): this {
        this.steps.push(new AnalysisStep(this.deps.linkAnalyzer, this.deps.logger));
        return this;
    }

    /**
     * Add Twitter enrichment step - fetches tweet content for Twitter/X links
     */
    enrichTwitter(): this {
        this.steps.push(
            new TwitterEnrichmentStep(this.deps.tweetClient, this.deps.linkAnalyzer, this.deps.logger)
        );
        return this;
    }

    /**
     * Add retry step - handles rate-limited Twitter links
     * Should be added after enrichTwitter()
     */
    withRetry(): this {
        this.steps.push(new RetryStep(this.deps.retryHandler, this.deps.logger));
        return this;
    }

    /**
     * Add export step - exports results to CSV and/or Notion
     */
    exportTo(options: ExportStepOptions = { csv: true, notion: true }): this {
        this.steps.push(new ExportStep(this.deps.exportService, this.deps.logger, options));
        return this;
    }

    /**
     * Build the workflow
     */
    build(): IWorkflow<Bookmark> {
        return super.build();
    }
}

import type { WorkflowPreset, WorkflowOptions, IWorkflow } from '../types.js';
import { Workflow } from '../Workflow.js';
import { BaseClient, type BaseClientConfig } from './BaseClient.js';

/**
 * Workflow client for creating and executing data workflows
 */
export class WorkflowClient extends BaseClient {
    constructor(config: BaseClientConfig) {
        super(config);
    }

    /**
     * Create a workflow for processing data from a source
     *
     * @param preset - Workflow preset (e.g., 'gmail', 'full', 'quick')
     * @param options - Workflow options including filters and step toggles
     * @returns A Workflow that can be executed with lifecycle hooks
     *
     * @example
     * ```typescript
     * const workflow = client.workflow.create('gmail', {
     *     filter: { email: 'user@example.com' },
     *     skipAnalysis: false,
     *     skipTwitter: true
     * });
     *
     * await workflow.execute({
     *     onStart: ({ logger }) => logger.info('Starting...'),
     *     onComplete: ({ logger }) => logger.info('Done!'),
     *     onError: ({ logger }) => logger.error('Failed!')
     * });
     * ```
     */
    create(preset: WorkflowPreset, options: WorkflowOptions = {}): IWorkflow {
        return new Workflow({
            preset,
            options,
            logger: this.logger,
            baseUrl: this.baseUrl,
            sessionToken: this.sessionToken,
        });
    }
}

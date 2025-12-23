import { test, expect, describe, mock } from 'bun:test';
import {
    WorkflowBuilder,
    WorkflowExecutionStats,
    WorkflowStartInfo,
    WorkflowErrorInfo,
} from '../../../application/workflows/WorkflowBuilder';
import { IWorkflowStep, WorkflowContext, StepResult } from '../../../application/workflows/IWorkflowStep';
import type { ILogger } from '../../../domain/ports/ILogger';

/**
 * Mock logger for tests
 */
const createMockLogger = (): ILogger => ({
    info: mock(() => {}),
    debug: mock(() => {}),
    warning: mock(() => {}),
    error: mock(() => {}),
    await: mock(() => ({
        start: () => {},
        update: () => {},
        stop: () => {},
    })),
});

/**
 * Create a simple step that succeeds
 */
const createSuccessStep = (name: string, itemsToAdd: string[] = []): IWorkflowStep<string> => ({
    name,
    execute: async (context: WorkflowContext<string>): Promise<StepResult<string>> => ({
        context: {
            ...context,
            items: [...context.items, ...itemsToAdd],
        },
        continue: true,
        message: `${name} completed`,
    }),
});

/**
 * Create a step that throws an error
 */
const createErrorStep = (name: string, errorMessage: string): IWorkflowStep<string> => ({
    name,
    execute: async (): Promise<StepResult<string>> => {
        throw new Error(errorMessage);
    },
});

/**
 * Create a step that stops the workflow
 */
const createStopStep = (name: string, message: string): IWorkflowStep<string> => ({
    name,
    execute: async (context: WorkflowContext<string>): Promise<StepResult<string>> => ({
        context,
        continue: false,
        message,
    }),
});

describe('WorkflowBuilder lifecycle hooks', () => {
    describe('onStart hook', () => {
        test('should call onStart before first step executes', async () => {
            const logger = createMockLogger();
            const onStartInfo: WorkflowStartInfo[] = [];

            const workflow = new WorkflowBuilder<string>(logger)
                .addStep(createSuccessStep('step1'))
                .addStep(createSuccessStep('step2'))
                .onStart(info => {
                    onStartInfo.push(info);
                })
                .build();

            await workflow.execute('/input', '/output');

            expect(onStartInfo.length).toBe(1);
            expect(onStartInfo[0].stepNames).toEqual(['step1', 'step2']);
            expect(onStartInfo[0].sourcePath).toBe('/input');
            expect(onStartInfo[0].outputPath).toBe('/output');
        });

        test('should await async onStart callback', async () => {
            const logger = createMockLogger();
            const events: string[] = [];

            const workflow = new WorkflowBuilder<string>(logger)
                .addStep({
                    name: 'step1',
                    execute: async context => {
                        events.push('step1');
                        return { context, continue: true };
                    },
                })
                .onStart(async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    events.push('onStart');
                })
                .build();

            await workflow.execute('/input', '/output');

            expect(events).toEqual(['onStart', 'step1']);
        });
    });

    describe('onComplete hook', () => {
        test('should call onComplete with stats after successful workflow', async () => {
            const logger = createMockLogger();
            let receivedStats: WorkflowExecutionStats | null = null;
            let receivedContext: WorkflowContext<string> | null = null;

            const workflow = new WorkflowBuilder<string>(logger)
                .addStep(createSuccessStep('step1', ['item1']))
                .addStep(createSuccessStep('step2', ['item2']))
                .onComplete((stats, context) => {
                    receivedStats = stats;
                    receivedContext = context;
                })
                .build();

            await workflow.execute('/input', '/output');

            expect(receivedStats).not.toBeNull();
            expect(receivedStats!.totalSteps).toBe(2);
            expect(receivedStats!.completedSteps).toBe(2);
            expect(receivedStats!.executedStepNames).toEqual(['step1', 'step2']);
            expect(receivedStats!.success).toBe(true);
            expect(receivedStats!.itemsProcessed).toBe(2);
            expect(receivedStats!.durationMs).toBeGreaterThanOrEqual(0);
            expect(receivedContext!.items).toEqual(['item1', 'item2']);
        });

        test('should call onComplete even when workflow stops early', async () => {
            const logger = createMockLogger();
            let receivedStats: WorkflowExecutionStats | null = null;

            const workflow = new WorkflowBuilder<string>(logger)
                .addStep(createSuccessStep('step1'))
                .addStep(createStopStep('step2', 'stopping early'))
                .addStep(createSuccessStep('step3'))
                .onComplete(stats => {
                    receivedStats = stats;
                })
                .build();

            await workflow.execute('/input', '/output');

            expect(receivedStats).not.toBeNull();
            expect(receivedStats!.totalSteps).toBe(3);
            expect(receivedStats!.completedSteps).toBe(2);
            expect(receivedStats!.executedStepNames).toEqual(['step1', 'step2']);
            expect(receivedStats!.success).toBe(false);
        });

        test('should call onComplete even when error is thrown', async () => {
            const logger = createMockLogger();
            let receivedStats: WorkflowExecutionStats | null = null;

            const workflow = new WorkflowBuilder<string>(logger)
                .addStep(createSuccessStep('step1'))
                .addStep(createErrorStep('step2', 'test error'))
                .onComplete(stats => {
                    receivedStats = stats;
                })
                .build();

            await expect(workflow.execute('/input', '/output')).rejects.toThrow('test error');

            expect(receivedStats).not.toBeNull();
            expect(receivedStats!.success).toBe(false);
            expect(receivedStats!.completedSteps).toBe(1);
        });
    });

    describe('onError hook', () => {
        test('should call onError with error info when step throws', async () => {
            const logger = createMockLogger();
            let receivedErrorInfo: WorkflowErrorInfo<string> | null = null;

            const workflow = new WorkflowBuilder<string>(logger)
                .addStep(createSuccessStep('step1', ['item1']))
                .addStep(createErrorStep('step2', 'test error'))
                .onError(info => {
                    receivedErrorInfo = info;
                    return { continue: false };
                })
                .build();

            await expect(workflow.execute('/input', '/output')).rejects.toThrow('test error');

            expect(receivedErrorInfo).not.toBeNull();
            expect(receivedErrorInfo!.error.message).toBe('test error');
            expect(receivedErrorInfo!.stepName).toBe('step2');
            expect(receivedErrorInfo!.stepIndex).toBe(1);
            expect(receivedErrorInfo!.context.items).toEqual(['item1']);
        });

        test('should continue workflow when onError returns continue: true', async () => {
            const logger = createMockLogger();
            const executedSteps: string[] = [];

            const workflow = new WorkflowBuilder<string>(logger)
                .addStep({
                    name: 'step1',
                    execute: async context => {
                        executedSteps.push('step1');
                        return { context, continue: true };
                    },
                })
                .addStep({
                    name: 'step2',
                    execute: async () => {
                        executedSteps.push('step2-start');
                        throw new Error('step2 error');
                    },
                })
                .addStep({
                    name: 'step3',
                    execute: async context => {
                        executedSteps.push('step3');
                        return { context, continue: true };
                    },
                })
                .onError(() => ({ continue: true }))
                .build();

            await workflow.execute('/input', '/output');

            expect(executedSteps).toEqual(['step1', 'step2-start', 'step3']);
        });

        test('should use replacement context from onError when provided', async () => {
            const logger = createMockLogger();
            let finalItems: string[] = [];

            const workflow = new WorkflowBuilder<string>(logger)
                .addStep(createSuccessStep('step1', ['item1']))
                .addStep(createErrorStep('step2', 'error'))
                .addStep({
                    name: 'step3',
                    execute: async context => {
                        finalItems = context.items;
                        return { context, continue: true };
                    },
                })
                .onError(({ context }) => ({
                    continue: true,
                    context: {
                        ...context,
                        items: [...context.items, 'recovered-item'],
                    },
                }))
                .build();

            await workflow.execute('/input', '/output');

            expect(finalItems).toEqual(['item1', 'recovered-item']);
        });

        test('should stop workflow when onError returns continue: false', async () => {
            const logger = createMockLogger();
            const executedSteps: string[] = [];

            const workflow = new WorkflowBuilder<string>(logger)
                .addStep({
                    name: 'step1',
                    execute: async context => {
                        executedSteps.push('step1');
                        return { context, continue: true };
                    },
                })
                .addStep(createErrorStep('step2', 'stop here'))
                .addStep({
                    name: 'step3',
                    execute: async context => {
                        executedSteps.push('step3');
                        return { context, continue: true };
                    },
                })
                .onError(() => ({ continue: false }))
                .build();

            await expect(workflow.execute('/input', '/output')).rejects.toThrow('stop here');

            expect(executedSteps).toEqual(['step1']);
        });
    });

    describe('hook combinations', () => {
        test('should call all hooks in correct order for successful workflow', async () => {
            const logger = createMockLogger();
            const events: string[] = [];

            const workflow = new WorkflowBuilder<string>(logger)
                .addStep({
                    name: 'step1',
                    execute: async context => {
                        events.push('step1');
                        return { context, continue: true };
                    },
                })
                .onStart(() => {
                    events.push('onStart');
                })
                .onComplete(() => {
                    events.push('onComplete');
                })
                .build();

            await workflow.execute('/input', '/output');

            expect(events).toEqual(['onStart', 'step1', 'onComplete']);
        });

        test('should call all hooks in correct order when error occurs and continues', async () => {
            const logger = createMockLogger();
            const events: string[] = [];

            const workflow = new WorkflowBuilder<string>(logger)
                .addStep({
                    name: 'step1',
                    execute: async () => {
                        events.push('step1');
                        throw new Error('test');
                    },
                })
                .addStep({
                    name: 'step2',
                    execute: async context => {
                        events.push('step2');
                        return { context, continue: true };
                    },
                })
                .onStart(() => {
                    events.push('onStart');
                })
                .onError(() => {
                    events.push('onError');
                    return { continue: true };
                })
                .onComplete(() => {
                    events.push('onComplete');
                })
                .build();

            await workflow.execute('/input', '/output');

            expect(events).toEqual(['onStart', 'step1', 'onError', 'step2', 'onComplete']);
        });
    });

    describe('fluent API', () => {
        test('should allow chaining hook methods', () => {
            const logger = createMockLogger();

            const builder = new WorkflowBuilder<string>(logger)
                .onStart(() => {})
                .addStep(createSuccessStep('step1'))
                .onError(() => ({ continue: false }))
                .addStep(createSuccessStep('step2'))
                .onComplete(() => {});

            expect(builder.build().getStepNames()).toEqual(['step1', 'step2']);
        });

        test('should allow conditional hook registration with when()', async () => {
            const logger = createMockLogger();
            const enableLogging = true;
            const events: string[] = [];

            const workflow = new WorkflowBuilder<string>(logger)
                .addStep(createSuccessStep('step1'))
                .when(enableLogging, b =>
                    b
                        .onStart(() => {
                            events.push('start');
                        })
                        .onComplete(() => {
                            events.push('complete');
                        })
                )
                .build();

            await workflow.execute('/input', '/output');

            expect(events).toEqual(['start', 'complete']);
        });
    });
});

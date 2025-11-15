/**
 * Workflow framework exports
 * A lightweight workflow system for building data processing pipelines
 */

export type { IProducer } from './IProducer.js';
export type { IStage } from './IStage.js';
export type { IConsumer } from './IConsumer.js';
export { Pipeline } from './Pipeline.js';
export { WorkflowExecutor } from './WorkflowExecutor.js';
export type { WorkflowOptions, WorkflowStats, ErrorHandler } from './WorkflowExecutor.js';

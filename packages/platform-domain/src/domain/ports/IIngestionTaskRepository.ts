import type { IngestionTask, IngestionTaskCreate, IngestionResult } from '../entities/IngestionTask.js';
import type { TaskStatus, TaskProgress } from '@platform/task';

/**
 * Data for updating task status
 */
export interface IngestionTaskUpdate {
    status?: TaskStatus;
    progress?: number;
    message?: string;
    currentStep?: string;
    itemProgress?: TaskProgress;
    result?: IngestionResult;
}

export interface IIngestionTaskRepository {
    create(data: IngestionTaskCreate): Promise<IngestionTask>;
    findById(taskId: string, userId: string): Promise<IngestionTask | null>;
    findByUserId(userId: string): Promise<IngestionTask[]>;
    updateStatus(taskId: string, update: IngestionTaskUpdate): Promise<void>;
}

import type { BackgroundTask, BackgroundTaskCreate, TaskResult } from '../entities/BackgroundTask.js';
import type { TaskStatus, TaskProgress } from '@platform/task';

/**
 * Data for updating task status
 */
export interface BackgroundTaskUpdate {
    status?: TaskStatus;
    progress?: number;
    message?: string;
    currentStep?: string;
    itemProgress?: TaskProgress;
    result?: TaskResult;
}

export interface IBackgroundTaskRepository {
    create(data: BackgroundTaskCreate): Promise<BackgroundTask>;
    findById(taskId: string, userId: string): Promise<BackgroundTask | null>;
    findByUserId(userId: string): Promise<BackgroundTask[]>;
    updateStatus(taskId: string, update: BackgroundTaskUpdate): Promise<void>;
}

import type { Task } from '@platform/task';

export interface TaskResult {
    itemsProcessed: number;
    itemsCreated: number;
    errors: string[];
}

export interface BackgroundTask extends Task {
    userId: string;
    preset: string;
    result: TaskResult | null;
}

export interface BackgroundTaskCreate {
    taskId: string;
    userId: string;
    preset: string;
    backendTaskId: string;
}

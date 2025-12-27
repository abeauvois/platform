import type { Task } from '@platform/task';

export interface IngestionResult {
    itemsProcessed: number;
    itemsCreated: number;
    errors: string[];
}

export interface IngestionTask extends Task {
    userId: string;
    preset: string;
    result: IngestionResult | null;
}

export interface IngestionTaskCreate {
    taskId: string;
    userId: string;
    preset: string;
    backendTaskId: string;
}

import type { IngestionTask, IngestionTaskCreate } from '../entities/IngestionTask.js';

export interface IIngestionTaskRepository {
    create(data: IngestionTaskCreate): Promise<IngestionTask>;
    findById(taskId: string, userId: string): Promise<IngestionTask | null>;
    findByUserId(userId: string): Promise<IngestionTask[]>;
}

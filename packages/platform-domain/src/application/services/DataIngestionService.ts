import type { IBackgroundTaskRunner, BackgroundTaskOptions, IIdGenerator } from '@platform/task';
import type { IIngestionTaskRepository } from '../../domain/ports/IIngestionTaskRepository.js';
import type { IngestionTask } from '../../domain/entities/IngestionTask.js';

export interface IngestionRequest {
    preset: string;
    filter?: unknown;
}

export class IngestionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IngestionError';
    }
}

export class DataIngestionService {
    private static readonly TASK_TYPE = 'ingest-workflow';
    private static readonly DEFAULT_OPTIONS: BackgroundTaskOptions = {
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
    };

    constructor(
        private readonly taskRunner: IBackgroundTaskRunner,
        private readonly repository: IIngestionTaskRepository,
        private readonly idGenerator: IIdGenerator
    ) {}

    async startIngestion(userId: string, request: IngestionRequest): Promise<IngestionTask> {
        const taskId = this.idGenerator.generate('ingest');

        const backendTaskId = await this.taskRunner.submit(
            DataIngestionService.TASK_TYPE,
            { taskId, userId, request },
            DataIngestionService.DEFAULT_OPTIONS
        );

        if (!backendTaskId) {
            throw new IngestionError('Failed to start data ingestion');
        }

        return await this.repository.create({
            taskId,
            userId,
            preset: request.preset,
            backendTaskId,
        });
    }

    async getIngestion(taskId: string, userId: string): Promise<IngestionTask | null> {
        return await this.repository.findById(taskId, userId);
    }

    async listIngestions(userId: string): Promise<IngestionTask[]> {
        return await this.repository.findByUserId(userId);
    }
}

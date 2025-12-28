import type { IBackgroundTaskRunner, BackgroundTaskOptions, IIdGenerator } from '@platform/task';
import type { IBackgroundTaskRepository } from '../../domain/ports/IBackgroundTaskRepository.js';
import type { BackgroundTask } from '../../domain/entities/BackgroundTask.js';

export interface TaskRequest {
    preset: string;
    filter?: unknown;
}

export class TaskError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TaskError';
    }
}

export class BackgroundTaskService {
    private static readonly TASK_TYPE = 'workflow';
    private static readonly DEFAULT_OPTIONS: BackgroundTaskOptions = {
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
    };

    constructor(
        private readonly taskRunner: IBackgroundTaskRunner,
        private readonly repository: IBackgroundTaskRepository,
        private readonly idGenerator: IIdGenerator
    ) {}

    async startTask(userId: string, request: TaskRequest): Promise<BackgroundTask> {
        const taskId = this.idGenerator.generate('task');

        const backendTaskId = await this.taskRunner.submit(
            BackgroundTaskService.TASK_TYPE,
            { taskId, userId, request },
            BackgroundTaskService.DEFAULT_OPTIONS
        );

        if (!backendTaskId) {
            throw new TaskError('Failed to start background task');
        }

        return await this.repository.create({
            taskId,
            userId,
            preset: request.preset,
            backendTaskId,
        });
    }

    async getTask(taskId: string, userId: string): Promise<BackgroundTask | null> {
        return await this.repository.findById(taskId, userId);
    }

    async listTasks(userId: string): Promise<BackgroundTask[]> {
        return await this.repository.findByUserId(userId);
    }
}

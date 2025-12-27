export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface TaskProgress {
    current: number;
    total: number;
}

export interface Task {
    taskId: string;
    status: TaskStatus;
    progress: number;
    message: string;
    currentStep: string | null;
    itemProgress: TaskProgress | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}

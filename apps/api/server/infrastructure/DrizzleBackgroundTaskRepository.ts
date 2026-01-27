import { db, backgroundTasks, eq, desc, and } from '@abeauvois/platform-db';
import type { IBackgroundTaskRepository, BackgroundTask, BackgroundTaskCreate, BackgroundTaskUpdate } from '@abeauvois/platform-domain';

export class DrizzleBackgroundTaskRepository implements IBackgroundTaskRepository {
    async create(data: BackgroundTaskCreate): Promise<BackgroundTask> {
        const [result] = await db
            .insert(backgroundTasks)
            .values({
                id: data.taskId,
                userId: data.userId,
                preset: data.preset,
                pgBossJobId: data.backendTaskId,
                status: 'pending',
                progress: 0,
                message: 'Task started',
            })
            .returning();

        return this.toDomain(result);
    }

    async findById(taskId: string, userId: string): Promise<BackgroundTask | null> {
        const [result] = await db
            .select()
            .from(backgroundTasks)
            .where(and(eq(backgroundTasks.id, taskId), eq(backgroundTasks.userId, userId)));

        return result ? this.toDomain(result) : null;
    }

    async findByUserId(userId: string): Promise<BackgroundTask[]> {
        const results = await db
            .select()
            .from(backgroundTasks)
            .where(eq(backgroundTasks.userId, userId))
            .orderBy(desc(backgroundTasks.createdAt));

        return results.map((r) => this.toDomain(r));
    }

    async updateStatus(taskId: string, update: BackgroundTaskUpdate): Promise<void> {
        await db
            .update(backgroundTasks)
            .set({
                ...update,
                updatedAt: new Date(),
            })
            .where(eq(backgroundTasks.id, taskId));
    }

    private toDomain(row: typeof backgroundTasks.$inferSelect): BackgroundTask {
        return {
            taskId: row.id,
            userId: row.userId,
            preset: row.preset,
            status: row.status as BackgroundTask['status'],
            progress: row.progress,
            message: row.message,
            currentStep: row.currentStep,
            itemProgress: row.itemProgress as BackgroundTask['itemProgress'],
            result: row.result as BackgroundTask['result'],
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
}

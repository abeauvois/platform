import { db, ingestJobs, eq, desc, and } from '@platform/db';
import type { IIngestionTaskRepository, IngestionTask, IngestionTaskCreate } from '@platform/platform-domain';

export class DrizzleIngestionTaskRepository implements IIngestionTaskRepository {
    async create(data: IngestionTaskCreate): Promise<IngestionTask> {
        const [result] = await db
            .insert(ingestJobs)
            .values({
                id: data.taskId,
                userId: data.userId,
                preset: data.preset,
                pgBossJobId: data.backendTaskId,
                status: 'pending',
                progress: 0,
                message: 'Ingestion started',
            })
            .returning();

        return this.toDomain(result);
    }

    async findById(taskId: string, userId: string): Promise<IngestionTask | null> {
        const [result] = await db
            .select()
            .from(ingestJobs)
            .where(and(eq(ingestJobs.id, taskId), eq(ingestJobs.userId, userId)));

        return result ? this.toDomain(result) : null;
    }

    async findByUserId(userId: string): Promise<IngestionTask[]> {
        const results = await db
            .select()
            .from(ingestJobs)
            .where(eq(ingestJobs.userId, userId))
            .orderBy(desc(ingestJobs.createdAt));

        return results.map((r) => this.toDomain(r));
    }

    private toDomain(row: typeof ingestJobs.$inferSelect): IngestionTask {
        return {
            taskId: row.id,
            userId: row.userId,
            preset: row.preset,
            status: row.status as IngestionTask['status'],
            progress: row.progress,
            message: row.message,
            currentStep: row.currentStep,
            itemProgress: row.itemProgress as IngestionTask['itemProgress'],
            result: row.result as IngestionTask['result'],
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
}

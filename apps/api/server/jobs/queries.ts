import { eq, desc, and } from 'drizzle-orm';
import { db } from '../db/db';
import { ingestJobs } from '../db/schema';
import type { IngestJobStatus, IngestJobResult } from './types';

export interface IngestJobRecord {
    id: string;
    userId: string;
    preset: string;
    status: IngestJobStatus;
    progress: number;
    message: string;
    result: IngestJobResult | null;
    pgBossJobId: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}

export async function createIngestJob(data: {
    id: string;
    userId: string;
    preset: string;
    pgBossJobId?: string;
}): Promise<IngestJobRecord> {
    const [result] = await db
        .insert(ingestJobs)
        .values({
            id: data.id,
            userId: data.userId,
            preset: data.preset,
            pgBossJobId: data.pgBossJobId ?? null,
            status: 'pending',
            progress: 0,
            message: 'Job created',
        })
        .returning();

    return result as unknown as IngestJobRecord;
}

export async function getIngestJobById(
    id: string,
    userId: string
): Promise<IngestJobRecord | null> {
    const [result] = await db
        .select()
        .from(ingestJobs)
        .where(and(eq(ingestJobs.id, id), eq(ingestJobs.userId, userId)));

    return (result as unknown as IngestJobRecord) ?? null;
}

export async function getIngestJobsByUserId(
    userId: string
): Promise<IngestJobRecord[]> {
    const results = await db
        .select()
        .from(ingestJobs)
        .where(eq(ingestJobs.userId, userId))
        .orderBy(desc(ingestJobs.createdAt));

    return results as unknown as IngestJobRecord[];
}

export async function updateIngestJobStatus(
    id: string,
    update: {
        status?: IngestJobStatus;
        progress?: number;
        message?: string;
        result?: IngestJobResult;
    }
): Promise<void> {
    await db
        .update(ingestJobs)
        .set({
            ...update,
            updatedAt: new Date(),
        })
        .where(eq(ingestJobs.id, id));
}

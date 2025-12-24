import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { ingestValidator } from '../validators/ingest.validator';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { getBoss } from '../jobs/boss';
import { QUEUE_NAMES, type IngestJobPayload } from '../jobs/types';
import {
    createIngestJob,
    getIngestJobById,
    getIngestJobsByUserId,
} from '../jobs/queries';

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
    return `ingest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const ingest = new Hono<HonoEnv>()
    .use(authMiddleware)

    /**
     * POST /api/ingest
     * Start a new ingestion workflow
     */
    .post('/', ingestValidator, async (c) => {
        const user = c.get('user');
        const request = c.req.valid('json');

        const jobId = generateJobId();
        const boss = getBoss();

        // Create job payload
        const payload: IngestJobPayload = {
            jobId,
            userId: user.id,
            request,
        };

        // Enqueue job with pg-boss
        const pgBossJobId = await boss.send(QUEUE_NAMES.INGEST, payload, {
            retryLimit: 3,
            retryDelay: 30,
            retryBackoff: true,
        });

        if (!pgBossJobId) {
            return c.json({ error: 'Failed to create job' }, 500);
        }

        // Create tracking record in custom table
        await createIngestJob({
            id: jobId,
            userId: user.id,
            preset: request.preset,
            pgBossJobId,
        });

        return c.json({
            jobId,
            status: 'pending',
            message: 'Ingest job started',
            preset: request.preset,
            filter: request.filter,
        }, 202);
    })

    /**
     * GET /api/ingest/:jobId
     * Get status of an ingestion job
     */
    .get('/:jobId', async (c) => {
        const user = c.get('user');
        const jobId = c.req.param('jobId');

        const job = await getIngestJobById(jobId, user.id);

        if (!job) {
            return c.json({ error: 'Job not found' }, 404);
        }

        return c.json({
            jobId: job.id,
            preset: job.preset,
            status: job.status,
            progress: job.progress,
            message: job.message,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            result: job.result,
        });
    })

    /**
     * GET /api/ingest
     * List all ingestion jobs for the current user
     */
    .get('/', async (c) => {
        const user = c.get('user');

        const jobs = await getIngestJobsByUserId(user.id);

        return c.json({
            jobs: jobs.map((job) => ({
                jobId: job.id,
                preset: job.preset,
                status: job.status,
                progress: job.progress,
                message: job.message,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt,
            })),
        });
    });

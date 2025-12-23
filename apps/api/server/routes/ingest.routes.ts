import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { ingestValidator, type IngestRequest } from '../validators/ingest.validator';
import { authMiddleware } from '@/middlewares/auth.middleware';

/**
 * Ingest job status
 */
interface IngestJob {
    id: string;
    userId: string;
    preset: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    message: string;
    createdAt: Date;
    updatedAt: Date;
    result?: {
        itemsProcessed: number;
        itemsCreated: number;
        errors: string[];
    };
}

// In-memory job store (in production, use a database or Redis)
const jobs = new Map<string, IngestJob>();

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
    return `ingest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Simulate workflow execution (placeholder for actual workflow integration)
 */
async function executeWorkflow(job: IngestJob, request: IngestRequest): Promise<void> {
    // Update job status to running
    job.status = 'running';
    job.message = `Starting ${request.preset} workflow`;
    job.updatedAt = new Date();

    try {
        // Simulate workflow steps
        const steps = ['extract', 'analyze', 'enrich', 'export'];
        const totalSteps = steps.length;

        for (let i = 0; i < totalSteps; i++) {
            const step = steps[i];

            // Skip steps based on options
            if (step === 'analyze' && request.skipAnalysis) continue;
            if (step === 'enrich' && request.skipTwitter) continue;

            job.message = `Running step: ${step}`;
            job.progress = Math.round(((i + 1) / totalSteps) * 100);
            job.updatedAt = new Date();

            // Simulate step execution time
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Mark as completed
        job.status = 'completed';
        job.progress = 100;
        job.message = 'Workflow completed successfully';
        job.result = {
            itemsProcessed: 0, // Placeholder
            itemsCreated: 0,   // Placeholder
            errors: [],
        };
        job.updatedAt = new Date();

    } catch (error) {
        job.status = 'failed';
        job.message = error instanceof Error ? error.message : 'Unknown error';
        job.updatedAt = new Date();
    }
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

        // Create a new job
        const jobId = generateJobId();
        const job: IngestJob = {
            id: jobId,
            userId: user.id,
            preset: request.preset,
            status: 'pending',
            progress: 0,
            message: 'Job created',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        jobs.set(jobId, job);

        // Start workflow execution in background (non-blocking)
        executeWorkflow(job, request).catch(err => {
            console.error(`Workflow error for job ${jobId}:`, err);
        });

        return c.json({
            jobId,
            status: job.status,
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

        const job = jobs.get(jobId);

        if (!job) {
            return c.json({ error: 'Job not found' }, 404);
        }

        // Verify ownership
        if (job.userId !== user.id) {
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

        const userJobs = Array.from(jobs.values())
            .filter(job => job.userId === user.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map(job => ({
                jobId: job.id,
                preset: job.preset,
                status: job.status,
                progress: job.progress,
                message: job.message,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt,
            }));

        return c.json({ jobs: userJobs });
    });

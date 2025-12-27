import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { ingestValidator } from '../validators/ingest.validator';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { getBoss, PgBossTaskRunner, TimestampIdGenerator } from '@platform/task';
import { DataIngestionService, IngestionError } from '@platform/platform-domain';
import { DrizzleIngestionTaskRepository } from '../infrastructure/DrizzleIngestionTaskRepository';

// Lazy initialization - service is created on first use after boss is initialized
let ingestionService: DataIngestionService | null = null;

function getIngestionService(): DataIngestionService {
    if (!ingestionService) {
        const taskRunner = new PgBossTaskRunner(getBoss());
        const repository = new DrizzleIngestionTaskRepository();
        const idGenerator = new TimestampIdGenerator();
        ingestionService = new DataIngestionService(taskRunner, repository, idGenerator);
    }
    return ingestionService;
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

        try {
            const task = await getIngestionService().startIngestion(user.id, request);

            return c.json({
                taskId: task.taskId,
                status: task.status,
                message: 'Data ingestion started',
                preset: request.preset,
                filter: request.filter,
            }, 202);
        } catch (error) {
            if (error instanceof IngestionError) {
                return c.json({ error: error.message }, 500);
            }
            throw error;
        }
    })

    /**
     * GET /api/ingest/:taskId
     * Get status of an ingestion task
     */
    .get('/:taskId', async (c) => {
        const user = c.get('user');
        const taskId = c.req.param('taskId');

        const task = await getIngestionService().getIngestion(taskId, user.id);

        if (!task) {
            return c.json({ error: 'Ingestion task not found' }, 404);
        }

        return c.json({
            taskId: task.taskId,
            preset: task.preset,
            status: task.status,
            progress: task.progress,
            message: task.message,
            currentStep: task.currentStep,
            itemProgress: task.itemProgress,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            result: task.result,
        });
    })

    /**
     * GET /api/ingest
     * List all ingestion tasks for the current user
     */
    .get('/', async (c) => {
        const user = c.get('user');

        const tasks = await getIngestionService().listIngestions(user.id);

        return c.json({
            tasks: tasks.map((task) => ({
                taskId: task.taskId,
                preset: task.preset,
                status: task.status,
                progress: task.progress,
                message: task.message,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
            })),
        });
    });

import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { workflowValidator } from '../validators/workflow.validator';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { getBoss, PgBossTaskRunner, TimestampIdGenerator } from '@abeauvois/platform-task';
import { BackgroundTaskService, TaskError } from '@abeauvois/platform-domain';
import { DrizzleBackgroundTaskRepository } from '../infrastructure/DrizzleBackgroundTaskRepository';

// Lazy initialization - service is created on first use after boss is initialized
let taskService: BackgroundTaskService | null = null;

function getTaskService(): BackgroundTaskService {
    if (!taskService) {
        const taskRunner = new PgBossTaskRunner(getBoss());
        const repository = new DrizzleBackgroundTaskRepository();
        const idGenerator = new TimestampIdGenerator();
        taskService = new BackgroundTaskService(taskRunner, repository, idGenerator);
    }
    return taskService;
}

export const workflows = new Hono<HonoEnv>()
    .use(authMiddleware)

    /**
     * POST /api/workflows
     * Start a new workflow
     */
    .post('/', workflowValidator, async (c) => {
        const user = c.get('user');
        const request = c.req.valid('json');

        try {
            const task = await getTaskService().startTask(user.id, request);

            return c.json({
                taskId: task.taskId,
                status: task.status,
                message: 'Workflow started',
                preset: request.preset,
                filter: request.filter,
            }, 202);
        } catch (error) {
            if (error instanceof TaskError) {
                return c.json({ error: error.message }, 500);
            }
            throw error;
        }
    })

    /**
     * GET /api/workflows/:taskId
     * Get status of a workflow task
     */
    .get('/:taskId', async (c) => {
        const user = c.get('user');
        const taskId = c.req.param('taskId');

        const task = await getTaskService().getTask(taskId, user.id);

        if (!task) {
            return c.json({ error: 'Task not found' }, 404);
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
     * GET /api/workflows
     * List all workflow tasks for the current user
     */
    .get('/', async (c) => {
        const user = c.get('user');

        const tasks = await getTaskService().listTasks(user.id);

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

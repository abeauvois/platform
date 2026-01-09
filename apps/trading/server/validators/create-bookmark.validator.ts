import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

import { SOURCE_ADAPTERS } from '@platform/platform-domain';

export const createBookmarkSchema =
  // z.strictObject(z.
  z.object({
    url: z.string().min(10, 'URL is required'),
    sourceAdapter: z.enum(SOURCE_ADAPTERS).default('Other'),
    tags: z.array(z.string()).optional(),
    summary: z.string().optional(),
    rawContent: z.string().optional()
  })
// );

export const createBookmarkValidator = zValidator(
  'json',
  createBookmarkSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(
        {
          errors: result.error.issues.map((issue) => issue.message),
        },
        400
      );
    }
  }
);

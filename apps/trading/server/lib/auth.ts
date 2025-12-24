import { createAuth } from '@platform/auth';
import { db } from '@platform/db';
import * as schema from '@platform/db/schema';

export const auth = createAuth({
    db,
    schema,
    provider: 'pg',
    trustedOrigins: [process.env.CLIENT_URL!],
});

import { createAuth } from '@platform/auth';
import { db } from '../db/db';
import * as schema from '../db/schema';

export const auth = createAuth({
  db,
  schema,
  provider: 'pg',
  trustedOrigins: [process.env.CLIENT_URL!],
});

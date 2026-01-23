import { createAuthMiddleware } from '@platform/auth';
import { auth } from '../lib/auth';

export const authMiddleware = createAuthMiddleware(auth);

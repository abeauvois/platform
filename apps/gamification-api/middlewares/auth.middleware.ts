import { createAuthMiddleware } from '@abeauvois/platform-auth';
import { auth } from '../lib/auth';

export const authMiddleware = createAuthMiddleware(auth);

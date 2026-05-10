import { z } from 'zod';

// Empty body schema — /auth/sync only requires the Bearer token (validated by middleware).
export const syncBodySchema = z.object({}).strict();
export type SyncBody = z.infer<typeof syncBodySchema>;

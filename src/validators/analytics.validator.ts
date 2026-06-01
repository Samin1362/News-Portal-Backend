import { z } from 'zod';

/**
 * Query for GET /admin/analytics. `window` is the number of days the snapshot
 * covers — constrained to the three buckets the dashboard offers.
 */
export const analyticsQuerySchema = z.object({
  window: z.coerce
    .number()
    .int()
    .refine((v) => v === 14 || v === 30 || v === 90, {
      message: 'window must be 14, 30, or 90',
    })
    .default(14),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

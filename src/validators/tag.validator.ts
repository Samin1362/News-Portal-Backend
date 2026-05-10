import { z } from 'zod';
import { paginationQuerySchema } from './common.validator.js';

export const createTagBodySchema = z
  .object({
    name: z.string().trim().min(1).max(60),
  })
  .strict();
export type CreateTagBody = z.infer<typeof createTagBodySchema>;

export const listTagsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(60).optional(),
});
export type ListTagsQuery = z.infer<typeof listTagsQuerySchema>;

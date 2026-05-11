import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema } from './common.validator.js';

const dateLike = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: 'must be a valid ISO date or datetime',
  })
  .transform((v) => new Date(v));

export const searchQuerySchema = paginationQuerySchema
  .extend({
    q: z.string().trim().min(2).max(200),
    categoryId: objectIdSchema.optional(),
    authorId: objectIdSchema.optional(),
    from: dateLike.optional(),
    to: dateLike.optional(),
  })
  .refine((d) => !d.from || !d.to || d.from.getTime() <= d.to.getTime(), {
    message: 'from must be on or before to',
    path: ['to'],
  });
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const suggestQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
});
export type SuggestQuery = z.infer<typeof suggestQuerySchema>;

import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema } from './common.validator.js';

const slugRegex = /^[a-z0-9-]+$/;

export const publicSlugParamSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(slugRegex),
});
export type PublicSlugParam = z.infer<typeof publicSlugParamSchema>;

export const publicAuthorParamSchema = z.object({
  id: objectIdSchema,
});
export type PublicAuthorParam = z.infer<typeof publicAuthorParamSchema>;

export const publicListQuerySchema = paginationQuerySchema;
export type PublicListQuery = z.infer<typeof publicListQuerySchema>;

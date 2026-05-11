import { z } from 'zod';
import { COMMENT_STATUSES } from '../config/constants.js';
import { paginationQuerySchema } from './common.validator.js';

export const createCommentBodySchema = z
  .object({
    content: z.string().trim().min(1).max(2000),
  })
  .strict();
export type CreateCommentBody = z.infer<typeof createCommentBodySchema>;

export const reportCommentBodySchema = z
  .object({
    reason: z.string().trim().min(3).max(500),
  })
  .strict();
export type ReportCommentBody = z.infer<typeof reportCommentBodySchema>;

export const articleCommentsEnabledBodySchema = z
  .object({
    isCommentsEnabled: z.boolean(),
  })
  .strict();
export type ArticleCommentsEnabledBody = z.infer<typeof articleCommentsEnabledBodySchema>;

export const listCommentsQuerySchema = paginationQuerySchema;
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;

export const listAdminCommentsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(COMMENT_STATUSES).optional(),
  reported: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});
export type ListAdminCommentsQuery = z.infer<typeof listAdminCommentsQuerySchema>;

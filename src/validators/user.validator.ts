import { z } from 'zod';
import { paginationQuerySchema, roleSchema } from './common.validator.js';

export const updateMeBodySchema = z
  .object({
    displayName: z.string().min(1).max(120).optional(),
    bio: z.string().max(500).optional(),
    photoURL: z.string().url().max(2048).optional().or(z.literal('')),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });
export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;

export const changeRoleBodySchema = z
  .object({
    role: roleSchema,
  })
  .strict();
export type ChangeRoleBody = z.infer<typeof changeRoleBodySchema>;

export const setBlockedBodySchema = z
  .object({
    isBlocked: z.boolean(),
  })
  .strict();
export type SetBlockedBody = z.infer<typeof setBlockedBodySchema>;

export const setCommentBlockedBodySchema = z
  .object({
    isCommentBlocked: z.boolean(),
  })
  .strict();
export type SetCommentBlockedBody = z.infer<typeof setCommentBlockedBodySchema>;

export const listUsersQuerySchema = paginationQuerySchema.extend({
  role: roleSchema.optional(),
  q: z.string().trim().min(1).max(120).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

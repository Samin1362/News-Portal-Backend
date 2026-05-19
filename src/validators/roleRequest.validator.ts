import { z } from 'zod';
import {
  paginationQuerySchema,
  roleSchema,
} from './common.validator.js';
import { ROLE_REQUEST_STATUSES } from '../config/constants.js';

const submittedInfoSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    displayName: z.string().trim().min(2).max(60),
    bio: z.string().trim().min(120).max(2000),
    expertiseTags: z
      .array(z.string().trim().toLowerCase().min(2).max(40))
      .min(1)
      .max(5),
    sampleLinks: z
      .array(z.string().url().max(2048).startsWith('https://'))
      .max(3)
      .default([]),
    motivation: z.string().trim().min(80).max(1500),
    phone: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{6,14}$/u, 'Phone must be in E.164 format')
      .optional(),
    photoPublicId: z.string().trim().min(1).max(255).optional(),
  })
  .strict();
export type SubmittedInfoInput = z.infer<typeof submittedInfoSchema>;

export const createRoleRequestBodySchema = z
  .object({
    toRole: roleSchema.refine(
      (r) => r === 'journalist' || r === 'editor',
      'Readers can only request journalist or editor roles',
    ),
    submittedInfo: submittedInfoSchema,
    verificationToken: z.string().trim().min(1).max(200),
  })
  .strict();
export type CreateRoleRequestBody = z.infer<typeof createRoleRequestBodySchema>;

export const listRoleRequestsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ROLE_REQUEST_STATUSES).optional(),
});
export type ListRoleRequestsQuery = z.infer<typeof listRoleRequestsQuerySchema>;

export const rejectRoleRequestBodySchema = z
  .object({
    reason: z.string().trim().min(20).max(1000),
  })
  .strict();
export type RejectRoleRequestBody = z.infer<typeof rejectRoleRequestBodySchema>;

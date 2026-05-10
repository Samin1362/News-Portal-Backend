import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { ROLES } from '../config/constants.js';

export const objectIdSchema = z
  .string()
  .refine((value) => ObjectId.isValid(value), { message: 'Invalid id' })
  .transform((value) => new ObjectId(value));

export const objectIdParamSchema = z.object({
  id: objectIdSchema,
});
export type ObjectIdParam = z.infer<typeof objectIdParamSchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const roleSchema = z.enum(ROLES);

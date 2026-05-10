import { z } from 'zod';
import { MEDIA_TYPES } from '../config/constants.js';
import { objectIdSchema, paginationQuerySchema } from './common.validator.js';

const CLOUDINARY_URL_RE = /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/.+$/;

const cloudinaryUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => CLOUDINARY_URL_RE.test(value), {
    message: 'url must point to res.cloudinary.com',
  });

/** Single-asset metadata as returned by Cloudinary on the frontend. */
export const mediaMetadataSchema = z
  .object({
    type: z.enum(MEDIA_TYPES),
    url: cloudinaryUrl,
    publicId: z.string().trim().min(1).max(300),
    format: z.string().trim().min(1).max(20).optional(),
    bytes: z.coerce.number().int().nonnegative().optional(),
    width: z.coerce.number().int().nonnegative().optional(),
    height: z.coerce.number().int().nonnegative().optional(),
    duration: z.coerce.number().nonnegative().optional(),
    alt: z.string().trim().max(500).optional(),
    caption: z.string().trim().max(500).optional(),
    articleId: objectIdSchema.optional(),
  })
  .strict();
export type MediaMetadata = z.infer<typeof mediaMetadataSchema>;

export const registerMediaBodySchema = mediaMetadataSchema;

export const registerMediaBulkBodySchema = z
  .object({
    items: z.array(mediaMetadataSchema).min(1).max(50),
  })
  .strict();
export type RegisterMediaBulkBody = z.infer<typeof registerMediaBulkBodySchema>;

export const updateMediaBodySchema = z
  .object({
    alt: z.string().trim().max(500).optional(),
    caption: z.string().trim().max(500).optional(),
    articleId: z.union([objectIdSchema, z.null()]).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, 'At least one field is required');
export type UpdateMediaBody = z.infer<typeof updateMediaBodySchema>;

export const listMediaQuerySchema = paginationQuerySchema.extend({
  type: z.enum(MEDIA_TYPES).optional(),
  articleId: objectIdSchema.optional(),
  unattached: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});
export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;

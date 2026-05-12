import { z } from 'zod';
import { AD_PLACEMENTS } from '../config/constants.js';
import { paginationQuerySchema } from './common.validator.js';

const CLOUDINARY_URL_RE = /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/.+$/;

const cloudinaryUrl = z
  .string()
  .url()
  .max(2048)
  .refine((v) => CLOUDINARY_URL_RE.test(v), {
    message: 'imageUrl must point to res.cloudinary.com',
  });

const dateLike = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: 'must be a valid ISO date or datetime',
  })
  .transform((v) => new Date(v));

const adDateRangeRefinement = <T extends { startDate?: Date | null; endDate?: Date | null }>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
) =>
  schema.refine(
    (d) => !d.startDate || !d.endDate || d.startDate.getTime() <= d.endDate.getTime(),
    { message: 'startDate must be on or before endDate', path: ['endDate'] },
  );

export const createAdBodySchema = adDateRangeRefinement(
  z
    .object({
      name: z.string().trim().min(1).max(120),
      placement: z.enum(AD_PLACEMENTS),
      imageUrl: cloudinaryUrl,
      publicId: z.string().trim().min(1).max(300),
      linkUrl: z.string().url().max(2048),
      altText: z.string().trim().max(500).default(''),
      isActive: z.boolean().default(true),
      startDate: dateLike.nullable().optional(),
      endDate: dateLike.nullable().optional(),
    })
    .strict(),
);
export type CreateAdBody = z.infer<typeof createAdBodySchema>;

export const updateAdBodySchema = adDateRangeRefinement(
  z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      placement: z.enum(AD_PLACEMENTS).optional(),
      imageUrl: cloudinaryUrl.optional(),
      publicId: z.string().trim().min(1).max(300).optional(),
      linkUrl: z.string().url().max(2048).optional(),
      altText: z.string().trim().max(500).optional(),
      isActive: z.boolean().optional(),
      startDate: dateLike.nullable().optional(),
      endDate: dateLike.nullable().optional(),
    })
    .strict()
    .refine((d) => Object.keys(d).length > 0, 'At least one field is required'),
);
export type UpdateAdBody = z.infer<typeof updateAdBodySchema>;

export const listAdsQuerySchema = paginationQuerySchema.extend({
  placement: z.enum(AD_PLACEMENTS).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});
export type ListAdsQuery = z.infer<typeof listAdsQuerySchema>;

export const publicAdsQuerySchema = z.object({
  placement: z.enum(AD_PLACEMENTS),
});
export type PublicAdsQuery = z.infer<typeof publicAdsQuerySchema>;

import { z } from 'zod';

export const createCategoryBodySchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, digits, and dashes')
      .min(2)
      .max(120)
      .optional(),
    description: z.string().trim().max(500).optional(),
    bannerUrl: z.string().url().max(2048).optional().or(z.literal('')),
    order: z.coerce.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;

export const updateCategoryBodySchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]+$/)
      .min(2)
      .max(120)
      .optional(),
    description: z.string().trim().max(500).optional(),
    bannerUrl: z.string().url().max(2048).optional().or(z.literal('')),
    order: z.coerce.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, 'At least one field is required');
export type UpdateCategoryBody = z.infer<typeof updateCategoryBodySchema>;

export const slugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/),
});
export type SlugParam = z.infer<typeof slugParamSchema>;

export const listCategoriesQuerySchema = z
  .object({
    includeInactive: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .strict();
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;

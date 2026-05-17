import { z } from 'zod';
import { ARTICLE_STATUSES } from '../config/constants.js';
import { objectIdSchema, paginationQuerySchema } from './common.validator.js';

const mediaItemSchema = z
  .object({
    url: z.string().url().max(2048),
    publicId: z.string().min(1).max(300),
    alt: z.string().max(500).optional(),
    caption: z.string().max(500).optional(),
  })
  .strict();

const videoItemSchema = z
  .object({
    url: z.string().url().max(2048),
    publicId: z.string().min(1).max(300),
    thumbnail: z.string().url().max(2048).optional(),
    caption: z.string().max(500).optional(),
  })
  .strict();

const seoInputSchema = z
  .object({
    title: z.string().trim().max(160).optional(),
    description: z.string().trim().max(300).optional(),
    ogImage: z.string().url().max(2048).optional(),
    canonicalUrl: z.string().url().max(2048).optional(),
    keywords: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  })
  .strict();

export const createArticleBodySchema = z
  .object({
    headline: z.string().trim().min(5).max(300),
    summary: z.string().trim().min(10).max(500),
    content: z.string().min(20),
    categoryId: objectIdSchema,
    tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    featuredImage: mediaItemSchema.nullable().optional(),
    gallery: z.array(mediaItemSchema).max(50).default([]),
    videos: z.array(videoItemSchema).max(20).default([]),
    seo: seoInputSchema.optional(),
    isCommentsEnabled: z.boolean().default(true),
  })
  .strict();
export type CreateArticleBody = z.infer<typeof createArticleBodySchema>;

export const updateArticleBodySchema = z
  .object({
    headline: z.string().trim().min(5).max(300).optional(),
    summary: z.string().trim().min(10).max(500).optional(),
    content: z.string().min(20).optional(),
    categoryId: objectIdSchema.optional(),
    tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    featuredImage: mediaItemSchema.nullable().optional(),
    gallery: z.array(mediaItemSchema).max(50).optional(),
    videos: z.array(videoItemSchema).max(20).optional(),
    seo: seoInputSchema.optional(),
    isCommentsEnabled: z.boolean().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, 'At least one field is required');
export type UpdateArticleBody = z.infer<typeof updateArticleBodySchema>;

export const listMineQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ARTICLE_STATUSES).optional(),
});
export type ListMineQuery = z.infer<typeof listMineQuerySchema>;

export const queueQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum(['submitted', 'under_review', 'approved', 'rejected', 'published'])
    .optional(),
});
export type QueueQuery = z.infer<typeof queueQuerySchema>;

export const submitBodySchema = z
  .object({
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .or(z.object({}).strict());
export type SubmitBody = z.infer<typeof submitBodySchema>;

export const rejectBodySchema = z
  .object({
    reason: z.string().trim().min(5).max(1000),
  })
  .strict();
export type RejectBody = z.infer<typeof rejectBodySchema>;

export const scheduleBodySchema = z
  .object({
    scheduledAt: z
      .string()
      .datetime({ offset: true })
      .or(z.string().datetime())
      .transform((v) => new Date(v))
      .refine((d) => d.getTime() > Date.now(), {
        message: 'scheduledAt must be in the future',
      }),
  })
  .strict();
export type ScheduleBody = z.infer<typeof scheduleBodySchema>;

export const flagsBodySchema = z
  .object({
    isBreaking: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isTrending: z.boolean().optional(),
  })
  .strict()
  .refine(
    (d) => d.isBreaking !== undefined || d.isFeatured !== undefined || d.isTrending !== undefined,
    'At least one flag is required',
  );
export type FlagsBody = z.infer<typeof flagsBodySchema>;

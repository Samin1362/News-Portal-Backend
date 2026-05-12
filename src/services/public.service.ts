import type { ObjectId, WithId } from 'mongodb';
import * as articleModel from '../models/article.model.js';
import * as categoryModel from '../models/category.model.js';
import * as tagModel from '../models/tag.model.js';
import { CARD_PROJECTION } from '../models/article.model.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';
import { LRUCache } from '../utils/lruCache.js';
import { toCategoryDTO, type CategoryDTO } from '../views/category.view.js';
import {
  toArticleCardListDTO,
  toArticleFullDTO,
  type ArticleCardDTO,
  type ArticleFullDTO,
} from '../views/article.view.js';
import type { ArticleDoc } from '../models/article.model.js';
import type { PublicListQuery } from '../validators/public.validator.js';

const HOMEPAGE_CACHE_TTL_MS = 30_000;
const CATEGORY_BLOCK_LIMIT = 6;
const ARTICLES_PER_CATEGORY_BLOCK = 4;
const HOMEPAGE_CACHE_KEY = 'homepage';

const homepageCache = new LRUCache<string, HomepageDTO>({
  maxEntries: 1,
  defaultTTLMs: HOMEPAGE_CACHE_TTL_MS,
});

export interface HomepageCategoryBlockDTO {
  category: CategoryDTO;
  articles: ArticleCardDTO[];
}

export interface HomepageDTO {
  breaking: ArticleCardDTO[];
  topHeadlines: ArticleCardDTO[];
  featured: ArticleCardDTO[];
  trending: ArticleCardDTO[];
  latest: ArticleCardDTO[];
  categories: HomepageCategoryBlockDTO[];
  videos: ArticleCardDTO[];
  gallery: ArticleCardDTO[];
  generatedAt: string;
}

export interface PublicArticleResponseDTO {
  article: ArticleFullDTO;
  related: ArticleCardDTO[];
}

interface PublicListOptions {
  limit: number;
  skip?: number;
  isBreaking?: boolean;
  isFeatured?: boolean;
  hasVideos?: boolean;
  hasGallery?: boolean;
  publishedSince?: Date;
  categoryId?: ObjectId;
  authorId?: ObjectId;
  tagSlug?: string;
  sort?: Parameters<typeof articleModel.listArticles>[0]['sort'];
}

async function listPublicCards(
  options: PublicListOptions,
): Promise<{ items: WithId<ArticleDoc>[]; total: number }> {
  return articleModel.listArticles({
    status: 'published',
    page: 1,
    limit: options.limit,
    skip: options.skip ?? 0,
    sort: options.sort ?? { publishedAt: -1 },
    projection: CARD_PROJECTION,
    isBreaking: options.isBreaking,
    isFeatured: options.isFeatured,
    hasVideos: options.hasVideos,
    hasGallery: options.hasGallery,
    publishedSince: options.publishedSince,
    categoryId: options.categoryId,
    authorId: options.authorId,
    tagSlug: options.tagSlug,
  });
}

async function buildHomepage(): Promise<HomepageDTO> {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    breaking,
    topHeadlines,
    featured,
    trending,
    latest,
    videos,
    gallery,
    activeCategories,
  ] = await Promise.all([
    listPublicCards({ isBreaking: true, publishedSince: last24h, limit: 10 }),
    listPublicCards({ limit: 5 }),
    listPublicCards({ isFeatured: true, limit: 6 }),
    listPublicCards({ sort: { recentViews: -1, publishedAt: -1 }, limit: 8 }),
    listPublicCards({ limit: 12 }),
    listPublicCards({ hasVideos: true, limit: 6 }),
    listPublicCards({ hasGallery: true, limit: 12 }),
    categoryModel.listAll({ onlyActive: true }),
  ]);

  const blockCategories = activeCategories.slice(0, CATEGORY_BLOCK_LIMIT);
  const categoryBlocks = await Promise.all(
    blockCategories.map(async (cat) => ({
      category: toCategoryDTO(cat),
      articles: toArticleCardListDTO(
        (await listPublicCards({ categoryId: cat._id, limit: ARTICLES_PER_CATEGORY_BLOCK }))
          .items,
      ),
    })),
  );

  return {
    breaking: toArticleCardListDTO(breaking.items),
    topHeadlines: toArticleCardListDTO(topHeadlines.items),
    featured: toArticleCardListDTO(featured.items),
    trending: toArticleCardListDTO(trending.items),
    latest: toArticleCardListDTO(latest.items),
    categories: categoryBlocks,
    videos: toArticleCardListDTO(videos.items),
    gallery: toArticleCardListDTO(gallery.items),
    generatedAt: new Date().toISOString(),
  };
}

export async function getHomepage(): Promise<HomepageDTO> {
  const cached = homepageCache.get(HOMEPAGE_CACHE_KEY);
  if (cached) return cached;
  const value = await buildHomepage();
  homepageCache.set(HOMEPAGE_CACHE_KEY, value);
  return value;
}

/** Test/admin hook — flushes the cached homepage so the next call rebuilds it. */
export function invalidateHomepageCache(): void {
  homepageCache.clear();
}

export async function getCategoryArticles(slug: string, query: PublicListQuery) {
  const category = await categoryModel.findBySlug(slug);
  if (!category || !category.isActive) {
    throw AppError.notFound('Category not found');
  }
  const { page, limit, skip } = parsePagination(query);
  const result = await articleModel.listArticles({
    status: 'published',
    categoryId: category._id,
    page,
    limit,
    skip,
    sort: { publishedAt: -1 },
    projection: CARD_PROJECTION,
  });
  return {
    category: toCategoryDTO(category),
    items: result.items,
    page,
    limit,
    total: result.total,
  };
}

export async function getArticleBySlug(slug: string): Promise<PublicArticleResponseDTO> {
  const article = await articleModel.findPublishedBySlug(slug);
  if (!article) throw AppError.notFound('Article not found');

  // Fire-and-forget view counter increment — must not block response or fail it.
  articleModel.incrementViewAndRecentViews(article._id).catch((err) => {
    logger.warn({ err, articleId: article._id.toString() }, 'View counter increment failed');
  });

  const related = await articleModel.findRelated(article, 6);

  return {
    article: toArticleFullDTO(article),
    related: toArticleCardListDTO(related),
  };
}

export async function getBreaking(query: PublicListQuery) {
  const { page, limit, skip } = parsePagination(query);
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await articleModel.listArticles({
    status: 'published',
    isBreaking: true,
    publishedSince: last24h,
    page,
    limit,
    skip,
    sort: { publishedAt: -1 },
    projection: CARD_PROJECTION,
  });
  return { items: result.items, page, limit, total: result.total };
}

export async function getTrending(query: PublicListQuery) {
  const { page, limit, skip } = parsePagination(query);
  const result = await articleModel.listArticles({
    status: 'published',
    page,
    limit,
    skip,
    sort: { recentViews: -1, publishedAt: -1 },
    projection: CARD_PROJECTION,
  });
  return { items: result.items, page, limit, total: result.total };
}

export async function getVideos(query: PublicListQuery) {
  const { page, limit, skip } = parsePagination(query);
  const result = await articleModel.listArticles({
    status: 'published',
    hasVideos: true,
    page,
    limit,
    skip,
    sort: { publishedAt: -1 },
    projection: CARD_PROJECTION,
  });
  return { items: result.items, page, limit, total: result.total };
}

export async function getGallery(query: PublicListQuery) {
  const { page, limit, skip } = parsePagination(query);
  const result = await articleModel.listArticles({
    status: 'published',
    hasGallery: true,
    page,
    limit,
    skip,
    sort: { publishedAt: -1 },
    projection: CARD_PROJECTION,
  });
  return { items: result.items, page, limit, total: result.total };
}

export async function getByTag(slug: string, query: PublicListQuery) {
  const tag = await tagModel.findBySlug(slug);
  if (!tag) throw AppError.notFound('Tag not found');
  const { page, limit, skip } = parsePagination(query);
  const result = await articleModel.listArticles({
    status: 'published',
    tagSlug: tag.slug,
    page,
    limit,
    skip,
    sort: { publishedAt: -1 },
    projection: CARD_PROJECTION,
  });
  return { tag, items: result.items, page, limit, total: result.total };
}

export async function getByAuthor(authorId: ObjectId, query: PublicListQuery) {
  const { page, limit, skip } = parsePagination(query);
  const result = await articleModel.listArticles({
    status: 'published',
    authorId,
    page,
    limit,
    skip,
    sort: { publishedAt: -1 },
    projection: CARD_PROJECTION,
  });
  return { items: result.items, page, limit, total: result.total };
}

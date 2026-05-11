import {
  ObjectId,
  type Collection,
  type Filter,
  type FindOptions,
  type Sort,
  type WithId,
} from 'mongodb';
import { getDb } from '../config/db.js';
import { COLLECTIONS, type ArticleStatus } from '../config/constants.js';

/**
 * MongoDB projection that strips heavy fields for card-style list responses.
 * Use with `listArticles({ projection: CARD_PROJECTION })` whenever the consumer
 * only needs the data exposed by `toArticleCardDTO`.
 */
export const CARD_PROJECTION = {
  content: 0,
  history: 0,
  gallery: 0,
  videos: 0,
} as const;

export interface ArticleMediaItem {
  url: string;
  publicId: string;
  alt?: string;
  caption?: string;
}

export interface ArticleVideoItem {
  url: string;
  publicId: string;
  thumbnail?: string;
  caption?: string;
}

export interface ArticleSeo {
  title: string;
  description: string;
  ogImage: string | null;
  canonicalUrl: string | null;
  keywords: string[];
}

export type ArticleHistoryAction =
  | 'create'
  | 'update'
  | 'submit'
  | 'start_review'
  | 'approve'
  | 'reject'
  | 'publish'
  | 'publish_scheduled'
  | 'schedule'
  | 'archive'
  | 'unarchive'
  | 'flags_changed'
  | 'soft_delete';

export interface ArticleHistoryEntry {
  action: ArticleHistoryAction;
  by: ObjectId | null; // null for system actions (e.g. cron-driven publish)
  at: Date;
  note?: string;
}

export interface ArticleDoc {
  _id: ObjectId;
  headline: string;
  slug: string;
  summary: string;
  content: string;
  authorId: ObjectId;
  categoryId: ObjectId;
  tags: string[]; // tag slugs
  featuredImage: ArticleMediaItem | null;
  gallery: ArticleMediaItem[];
  videos: ArticleVideoItem[];
  status: ArticleStatus;
  isBreaking: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  rejectionReason: string | null;
  reviewerId: ObjectId | null;
  approverId: ObjectId | null;
  history: ArticleHistoryEntry[];
  seo: ArticleSeo;
  viewCount: number;
  recentViews: number;
  commentCount: number;
  shareCount: number;
  isCommentsEnabled: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ArticleCounterField = 'viewCount' | 'recentViews' | 'commentCount' | 'shareCount';

function collection(): Collection<ArticleDoc> {
  return getDb().collection<ArticleDoc>(COLLECTIONS.ARTICLES);
}

function activeFilter(extra: Filter<ArticleDoc> = {}): Filter<ArticleDoc> {
  return { ...extra, isDeleted: { $ne: true } };
}

export async function findById(id: ObjectId | string): Promise<WithId<ArticleDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  return collection().findOne(activeFilter({ _id }));
}

export async function findBySlug(slug: string): Promise<WithId<ArticleDoc> | null> {
  return collection().findOne(activeFilter({ slug }));
}

export async function existsBySlug(slug: string): Promise<boolean> {
  return (await collection().countDocuments(activeFilter({ slug }), { limit: 1 })) > 0;
}

export interface CreateArticleInput {
  headline: string;
  slug: string;
  summary: string;
  content: string;
  authorId: ObjectId;
  categoryId: ObjectId;
  tags: string[];
  featuredImage: ArticleMediaItem | null;
  gallery: ArticleMediaItem[];
  videos: ArticleVideoItem[];
  seo: ArticleSeo;
  isCommentsEnabled: boolean;
}

export async function createArticle(
  input: CreateArticleInput,
  history: ArticleHistoryEntry,
): Promise<WithId<ArticleDoc>> {
  const now = new Date();
  const doc: Omit<ArticleDoc, '_id'> = {
    headline: input.headline,
    slug: input.slug,
    summary: input.summary,
    content: input.content,
    authorId: input.authorId,
    categoryId: input.categoryId,
    tags: input.tags,
    featuredImage: input.featuredImage,
    gallery: input.gallery,
    videos: input.videos,
    status: 'draft',
    isBreaking: false,
    isFeatured: false,
    isTrending: false,
    publishedAt: null,
    scheduledAt: null,
    rejectionReason: null,
    reviewerId: null,
    approverId: null,
    history: [history],
    seo: input.seo,
    viewCount: 0,
    recentViews: 0,
    commentCount: 0,
    shareCount: 0,
    isCommentsEnabled: input.isCommentsEnabled,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection().insertOne(doc as ArticleDoc);
  return { ...(doc as ArticleDoc), _id: result.insertedId };
}

export async function updateArticle(
  id: ObjectId | string,
  patch: Partial<ArticleDoc>,
  history?: ArticleHistoryEntry,
): Promise<WithId<ArticleDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  const update: Record<string, unknown> = {
    $set: { ...patch, updatedAt: new Date() },
  };
  if (history) {
    update.$push = { history };
  }
  return collection().findOneAndUpdate(activeFilter({ _id }), update, {
    returnDocument: 'after',
  });
}

/**
 * Atomic state transition: applies $set fields and pushes one history entry
 * in a single findOneAndUpdate call. If `expectedStatus` is provided, the
 * filter requires the article to currently be in that status — returning
 * null when the precondition fails.
 */
export async function transitionStatus(
  id: ObjectId | string,
  patch: Partial<ArticleDoc>,
  history: ArticleHistoryEntry,
  expectedStatus?: ArticleStatus | ArticleStatus[],
): Promise<WithId<ArticleDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  const filter: Filter<ArticleDoc> = activeFilter({ _id });
  if (expectedStatus) {
    filter.status = Array.isArray(expectedStatus)
      ? { $in: expectedStatus }
      : expectedStatus;
  }
  return collection().findOneAndUpdate(
    filter,
    {
      $set: { ...patch, updatedAt: new Date() },
      $push: { history },
    },
    { returnDocument: 'after' },
  );
}

export async function appendHistory(
  id: ObjectId | string,
  entry: ArticleHistoryEntry,
): Promise<void> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  await collection().updateOne(activeFilter({ _id }), {
    $set: { updatedAt: new Date() },
    $push: { history: entry },
  });
}

export async function softDelete(
  id: ObjectId | string,
  history: ArticleHistoryEntry,
): Promise<boolean> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  const result = await collection().updateOne(activeFilter({ _id }), {
    $set: { isDeleted: true, updatedAt: new Date() },
    $push: { history },
  });
  return result.modifiedCount === 1;
}

export async function incrementCounter(
  id: ObjectId | string,
  field: ArticleCounterField,
  amount = 1,
): Promise<void> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  await collection().updateOne(activeFilter({ _id }), {
    $inc: { [field]: amount },
  });
}

export interface ListArticlesParams {
  authorId?: ObjectId;
  status?: ArticleStatus | ArticleStatus[];
  categoryId?: ObjectId;
  tagSlug?: string;
  isBreaking?: boolean;
  isFeatured?: boolean;
  hasVideos?: boolean;
  hasGallery?: boolean;
  publishedSince?: Date;
  excludeId?: ObjectId;
  page: number;
  limit: number;
  skip: number;
  sort?: Sort;
  projection?: Record<string, 0 | 1>;
}

export async function listArticles(
  params: ListArticlesParams,
): Promise<{ items: WithId<ArticleDoc>[]; total: number }> {
  const filter: Filter<ArticleDoc> = activeFilter();
  if (params.authorId) filter.authorId = params.authorId;
  if (params.categoryId) filter.categoryId = params.categoryId;
  if (params.tagSlug) filter.tags = params.tagSlug;
  if (params.isBreaking !== undefined) filter.isBreaking = params.isBreaking;
  if (params.isFeatured !== undefined) filter.isFeatured = params.isFeatured;
  if (params.hasVideos) (filter as Record<string, unknown>)['videos.0'] = { $exists: true };
  if (params.hasGallery) (filter as Record<string, unknown>)['gallery.0'] = { $exists: true };
  if (params.publishedSince) filter.publishedAt = { $gte: params.publishedSince };
  if (params.excludeId) filter._id = { $ne: params.excludeId };
  if (params.status) {
    filter.status = Array.isArray(params.status) ? { $in: params.status } : params.status;
  }

  const sort: Sort = params.sort ?? { updatedAt: -1 };

  const findOptions: FindOptions = {};
  if (params.projection) {
    findOptions.projection = params.projection;
  }

  const cursor = collection()
    .find(filter, findOptions)
    .sort(sort)
    .skip(params.skip)
    .limit(params.limit);
  const [items, total] = await Promise.all([cursor.toArray(), collection().countDocuments(filter)]);
  return { items, total };
}

/** Public single-article fetch — only returns published, non-deleted articles. */
export async function findPublishedBySlug(slug: string): Promise<WithId<ArticleDoc> | null> {
  return collection().findOne(activeFilter({ slug, status: 'published' }));
}

/** Returns up to `limit` related articles in the same category, excluding self. */
export async function findRelated(
  article: WithId<ArticleDoc>,
  limit = 6,
): Promise<WithId<ArticleDoc>[]> {
  return collection()
    .find(
      activeFilter({
        categoryId: article.categoryId,
        status: 'published',
        _id: { $ne: article._id },
      }),
      { projection: CARD_PROJECTION },
    )
    .sort({ publishedAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Increments both `viewCount` (lifetime) and `recentViews` (24h trending counter)
 * in a single update. Only published, non-deleted articles are touched.
 */
export async function incrementViewAndRecentViews(id: ObjectId | string): Promise<void> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  await collection().updateOne(activeFilter({ _id, status: 'published' }), {
    $inc: { viewCount: 1, recentViews: 1 },
  });
}

/**
 * Daily-cron helper. Resets `recentViews` to 0 across all published articles
 * that currently have a non-zero value. Returns the number of docs updated.
 */
export async function resetRecentViews(): Promise<{ count: number }> {
  const result = await collection().updateMany(
    activeFilter({ status: 'published', recentViews: { $gt: 0 } }),
    { $set: { recentViews: 0 } },
  );
  return { count: result.modifiedCount };
}

// --- Phase 7: search ---

export interface SearchArticlesParams {
  q: string;
  categoryId?: ObjectId;
  authorId?: ObjectId;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
  skip: number;
}

export interface CategoryFacet {
  categoryId: string;
  count: number;
}

/**
 * Full-text search over published, non-deleted articles using the
 * `article_text_idx` registered in `models/indexes.ts`. Combines optional
 * category/author/date filters and computes a `byCategory` facet count.
 *
 * Sorted by text score (desc) then publishedAt (desc).
 */
export async function searchArticles(params: SearchArticlesParams): Promise<{
  items: WithId<ArticleDoc>[];
  total: number;
  facets: { byCategory: CategoryFacet[] };
}> {
  const filter: Filter<ArticleDoc> = {
    $text: { $search: params.q },
    status: 'published',
    isDeleted: { $ne: true },
  };
  if (params.categoryId) filter.categoryId = params.categoryId;
  if (params.authorId) filter.authorId = params.authorId;
  if (params.from || params.to) {
    const range: { $gte?: Date; $lte?: Date } = {};
    if (params.from) range.$gte = params.from;
    if (params.to) range.$lte = params.to;
    filter.publishedAt = range;
  }

  const cursor = collection()
    .find(filter, {
      projection: {
        ...CARD_PROJECTION,
        score: { $meta: 'textScore' },
      },
    })
    .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
    .skip(params.skip)
    .limit(params.limit);

  const [items, total, facetRows] = await Promise.all([
    cursor.toArray(),
    collection().countDocuments(filter),
    collection()
      .aggregate<{ _id: ObjectId; count: number }>([
        { $match: filter },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
  ]);

  const byCategory = facetRows.map((row) => ({
    categoryId: row._id.toString(),
    count: row.count,
  }));

  return { items, total, facets: { byCategory } };
}

export interface HeadlineSuggestion {
  _id: ObjectId;
  headline: string;
  slug: string;
}

/**
 * Returns up to `limit` headlines matching `q`, sorted by text score.
 * Used by the typeahead endpoint (`/public/search/suggest`).
 */
export async function suggestHeadlines(
  q: string,
  limit = 5,
): Promise<HeadlineSuggestion[]> {
  const cursor = collection()
    .find(
      {
        $text: { $search: q },
        status: 'published',
        isDeleted: { $ne: true },
      },
      {
        projection: {
          headline: 1,
          slug: 1,
          score: { $meta: 'textScore' },
        },
      },
    )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit);

  const docs = await cursor.toArray();
  return docs.map((d) => ({
    _id: d._id,
    headline: d.headline,
    slug: d.slug,
  }));
}

/** Counts non-deleted articles in a category — used by category remove. */
export async function countByCategory(categoryId: ObjectId): Promise<number> {
  return collection().countDocuments(activeFilter({ categoryId }));
}

/**
 * Used by the cron scheduler: finds approved articles whose scheduledAt has
 * passed and transitions them to `published` atomically. Returns the ids.
 */
export async function publishScheduled(now: Date): Promise<{ ids: ObjectId[]; count: number }> {
  const candidates = await collection()
    .find(
      activeFilter({
        status: 'approved',
        scheduledAt: { $lte: now, $ne: null },
      }),
    )
    .project<{ _id: ObjectId; scheduledAt: Date | null }>({ _id: 1, scheduledAt: 1 })
    .toArray();

  if (candidates.length === 0) return { ids: [], count: 0 };

  const ids = candidates.map((c) => c._id);
  const historyEntry: ArticleHistoryEntry = {
    action: 'publish_scheduled',
    by: null,
    at: now,
  };

  // Set publishedAt to the originally-scheduled time so the user-visible
  // "published" timestamp matches what was scheduled, not when the cron fired.
  for (const candidate of candidates) {
    await collection().updateOne(
      { _id: candidate._id },
      {
        $set: {
          status: 'published',
          publishedAt: candidate.scheduledAt ?? now,
          updatedAt: now,
        },
        $push: { history: historyEntry },
      },
    );
  }

  return { ids, count: ids.length };
}

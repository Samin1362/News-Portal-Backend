import { ObjectId, type WithId } from 'mongodb';
import * as articleModel from '../models/article.model.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination } from '../utils/pagination.js';
import { logger } from '../utils/logger.js';
import type { ArticleDoc, ArticleHistoryEntry } from '../models/article.model.js';
import type { ArticleStatus } from '../config/constants.js';
import type {
  FlagsBody,
  QueueQuery,
  RejectBody,
  ScheduleBody,
} from '../validators/article.validator.js';

interface Actor {
  id: string;
  role: 'reader' | 'journalist' | 'editor' | 'admin';
}

function actorObjectId(actor: Actor): ObjectId {
  return new ObjectId(actor.id);
}

async function loadOrThrow(id: ObjectId | string): Promise<WithId<ArticleDoc>> {
  const article = await articleModel.findById(id);
  if (!article) throw AppError.notFound('Article not found');
  return article;
}

function assertOwn(article: WithId<ArticleDoc>, actor: Actor): void {
  if (article.authorId.toString() !== actor.id) {
    throw AppError.forbidden('You can only act on your own articles');
  }
}

function assertCurrentStatus(
  article: WithId<ArticleDoc>,
  allowed: ArticleStatus[],
): void {
  if (!allowed.includes(article.status)) {
    throw AppError.conflict(
      `Article is in status "${article.status}"; expected one of: ${allowed.join(', ')}`,
    );
  }
}

export async function listQueue(
  query: QueueQuery,
): Promise<{ items: WithId<ArticleDoc>[]; page: number; limit: number; total: number }> {
  const { page, limit, skip } = parsePagination(query);
  // `status='all'` → no status filter (admin all-articles list).
  // any single status → that status only.
  // undefined → editor default of submitted + under_review.
  const status: ArticleStatus[] | undefined =
    query.status === 'all'
      ? undefined
      : query.status
      ? [query.status]
      : ['submitted', 'under_review'];
  const result = await articleModel.listArticles({
    status,
    page,
    limit,
    skip,
    sort: { updatedAt: -1 },
  });
  return { items: result.items, page, limit, total: result.total };
}

/** journalist (own) | editor | admin: draft|rejected → submitted */
export async function submit(id: ObjectId | string, actor: Actor): Promise<WithId<ArticleDoc>> {
  const article = await loadOrThrow(id);
  if (actor.role === 'journalist') assertOwn(article, actor);
  if (actor.role !== 'admin') assertCurrentStatus(article, ['draft', 'rejected']);

  const history: ArticleHistoryEntry = {
    action: 'submit',
    by: actorObjectId(actor),
    at: new Date(),
  };
  const updated = await articleModel.transitionStatus(
    id,
    {
      status: 'submitted',
      rejectionReason: null,
    },
    history,
  );
  if (!updated) throw AppError.notFound('Article not found');
  return updated;
}

/** editor | admin: submitted → under_review */
export async function startReview(
  id: ObjectId | string,
  actor: Actor,
): Promise<WithId<ArticleDoc>> {
  const article = await loadOrThrow(id);
  if (actor.role !== 'admin') assertCurrentStatus(article, ['submitted']);

  const history: ArticleHistoryEntry = {
    action: 'start_review',
    by: actorObjectId(actor),
    at: new Date(),
  };
  const updated = await articleModel.transitionStatus(
    id,
    {
      status: 'under_review',
      reviewerId: actorObjectId(actor),
    },
    history,
  );
  if (!updated) throw AppError.notFound('Article not found');
  return updated;
}

/** editor | admin: under_review → approved */
export async function approve(id: ObjectId | string, actor: Actor): Promise<WithId<ArticleDoc>> {
  const article = await loadOrThrow(id);
  if (actor.role !== 'admin') assertCurrentStatus(article, ['under_review']);

  const history: ArticleHistoryEntry = {
    action: 'approve',
    by: actorObjectId(actor),
    at: new Date(),
  };
  const updated = await articleModel.transitionStatus(
    id,
    {
      status: 'approved',
      approverId: actorObjectId(actor),
      rejectionReason: null,
    },
    history,
  );
  if (!updated) throw AppError.notFound('Article not found');
  return updated;
}

/** editor | admin: under_review → rejected */
export async function reject(
  id: ObjectId | string,
  actor: Actor,
  body: RejectBody,
): Promise<WithId<ArticleDoc>> {
  const article = await loadOrThrow(id);
  if (actor.role !== 'admin') assertCurrentStatus(article, ['under_review', 'submitted']);

  const history: ArticleHistoryEntry = {
    action: 'reject',
    by: actorObjectId(actor),
    at: new Date(),
    note: body.reason,
  };
  const updated = await articleModel.transitionStatus(
    id,
    {
      status: 'rejected',
      rejectionReason: body.reason,
    },
    history,
  );
  if (!updated) throw AppError.notFound('Article not found');
  return updated;
}

/** editor | admin: approved → published (immediate). Clears scheduledAt. */
export async function publish(id: ObjectId | string, actor: Actor): Promise<WithId<ArticleDoc>> {
  const article = await loadOrThrow(id);
  if (actor.role !== 'admin') assertCurrentStatus(article, ['approved']);

  const now = new Date();
  const history: ArticleHistoryEntry = {
    action: 'publish',
    by: actorObjectId(actor),
    at: now,
  };
  const updated = await articleModel.transitionStatus(
    id,
    {
      status: 'published',
      publishedAt: now,
      scheduledAt: null,
    },
    history,
  );
  if (!updated) throw AppError.notFound('Article not found');
  return updated;
}

/**
 * editor | admin: schedule an approved article for future publish.
 * Status stays `approved`; cron flips it to `published` when scheduledAt <= now.
 */
export async function schedule(
  id: ObjectId | string,
  actor: Actor,
  body: ScheduleBody,
): Promise<WithId<ArticleDoc>> {
  const article = await loadOrThrow(id);
  if (actor.role !== 'admin') assertCurrentStatus(article, ['approved']);

  const history: ArticleHistoryEntry = {
    action: 'schedule',
    by: actorObjectId(actor),
    at: new Date(),
    note: body.scheduledAt.toISOString(),
  };
  const updated = await articleModel.transitionStatus(
    id,
    {
      scheduledAt: body.scheduledAt,
    },
    history,
  );
  if (!updated) throw AppError.notFound('Article not found');
  return updated;
}

/** editor | admin: published → archived */
export async function archive(id: ObjectId | string, actor: Actor): Promise<WithId<ArticleDoc>> {
  const article = await loadOrThrow(id);
  if (actor.role !== 'admin') assertCurrentStatus(article, ['published']);

  const history: ArticleHistoryEntry = {
    action: 'archive',
    by: actorObjectId(actor),
    at: new Date(),
  };
  const updated = await articleModel.transitionStatus(
    id,
    { status: 'archived' },
    history,
  );
  if (!updated) throw AppError.notFound('Article not found');
  return updated;
}

/** editor | admin: archived → published */
export async function unarchive(
  id: ObjectId | string,
  actor: Actor,
): Promise<WithId<ArticleDoc>> {
  const article = await loadOrThrow(id);
  if (actor.role !== 'admin') assertCurrentStatus(article, ['archived']);

  const history: ArticleHistoryEntry = {
    action: 'unarchive',
    by: actorObjectId(actor),
    at: new Date(),
  };
  const updated = await articleModel.transitionStatus(
    id,
    { status: 'published' },
    history,
  );
  if (!updated) throw AppError.notFound('Article not found');
  return updated;
}

/** editor | admin: toggle isBreaking / isFeatured / isTrending. */
export async function setFlags(
  id: ObjectId | string,
  actor: Actor,
  body: FlagsBody,
): Promise<WithId<ArticleDoc>> {
  await loadOrThrow(id);
  const patch: Partial<ArticleDoc> = {};
  if (body.isBreaking !== undefined) patch.isBreaking = body.isBreaking;
  if (body.isFeatured !== undefined) patch.isFeatured = body.isFeatured;
  if (body.isTrending !== undefined) patch.isTrending = body.isTrending;

  const note = Object.entries(patch)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

  const history: ArticleHistoryEntry = {
    action: 'flags_changed',
    by: actorObjectId(actor),
    at: new Date(),
    note,
  };
  const updated = await articleModel.updateArticle(id, patch, history);
  if (!updated) throw AppError.notFound('Article not found');
  return updated;
}

/**
 * Called by the cron scheduler. Publishes any approved articles whose
 * scheduledAt has passed. Returns the number of articles published.
 */
export async function publishScheduledArticles(): Promise<number> {
  const result = await articleModel.publishScheduled(new Date());
  if (result.count > 0) {
    logger.info({ count: result.count, ids: result.ids.map((i) => i.toString()) },
      'Scheduled articles auto-published');
  }
  return result.count;
}

/**
 * Daily-cron helper. Resets the trending counter (`recentViews`) on every
 * published article. Returns the number of docs updated.
 */
export async function resetTrending(): Promise<number> {
  const result = await articleModel.resetRecentViews();
  if (result.count > 0) {
    logger.info({ count: result.count }, 'Trending counters reset');
  }
  return result.count;
}

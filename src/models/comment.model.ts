import {
  ObjectId,
  type Collection,
  type Filter,
  type Sort,
  type WithId,
} from 'mongodb';
import { getDb } from '../config/db.js';
import { COLLECTIONS, type CommentStatus } from '../config/constants.js';

export interface CommentReport {
  userId: ObjectId;
  reason: string;
  at: Date;
}

export interface CommentDoc {
  _id: ObjectId;
  articleId: ObjectId;
  userId: ObjectId;
  content: string;
  parentId: ObjectId | null;
  likedBy: ObjectId[];
  reportedBy: CommentReport[];
  status: CommentStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function collection(): Collection<CommentDoc> {
  return getDb().collection<CommentDoc>(COLLECTIONS.COMMENTS);
}

function activeFilter(extra: Filter<CommentDoc> = {}): Filter<CommentDoc> {
  return { ...extra, isDeleted: { $ne: true } };
}

export async function findById(id: ObjectId | string): Promise<WithId<CommentDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  return collection().findOne(activeFilter({ _id }));
}

export interface CreateCommentInput {
  articleId: ObjectId;
  userId: ObjectId;
  content: string;
  parentId: ObjectId | null;
  status: CommentStatus;
}

export async function createComment(input: CreateCommentInput): Promise<WithId<CommentDoc>> {
  const now = new Date();
  const doc: Omit<CommentDoc, '_id'> = {
    articleId: input.articleId,
    userId: input.userId,
    content: input.content,
    parentId: input.parentId,
    likedBy: [],
    reportedBy: [],
    status: input.status,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection().insertOne(doc as CommentDoc);
  return { ...(doc as CommentDoc), _id: result.insertedId };
}

export interface ListCommentsParams {
  articleId?: ObjectId;
  parentId?: ObjectId | null;
  userId?: ObjectId;
  status?: CommentStatus | CommentStatus[];
  reportedOnly?: boolean;
  page: number;
  limit: number;
  skip: number;
  sort?: Sort;
}

export async function listComments(
  params: ListCommentsParams,
): Promise<{ items: WithId<CommentDoc>[]; total: number }> {
  const filter: Filter<CommentDoc> = activeFilter();
  if (params.articleId) filter.articleId = params.articleId;
  if (params.userId) filter.userId = params.userId;
  if (params.parentId !== undefined) filter.parentId = params.parentId;
  if (params.status) {
    filter.status = Array.isArray(params.status) ? { $in: params.status } : params.status;
  }
  if (params.reportedOnly) {
    (filter as Record<string, unknown>)['reportedBy.0'] = { $exists: true };
  }

  const sort: Sort = params.sort ?? { createdAt: -1 };
  const cursor = collection()
    .find(filter)
    .sort(sort)
    .skip(params.skip)
    .limit(params.limit);
  const [items, total] = await Promise.all([cursor.toArray(), collection().countDocuments(filter)]);
  return { items, total };
}

export async function listTopLevelForArticle(
  articleId: ObjectId,
  params: { page: number; limit: number; skip: number },
): Promise<{ items: WithId<CommentDoc>[]; total: number }> {
  return listComments({
    articleId,
    parentId: null,
    status: 'approved',
    page: params.page,
    limit: params.limit,
    skip: params.skip,
    sort: { createdAt: -1 },
  });
}

export async function listFirstReplies(
  parentId: ObjectId,
  limit: number,
): Promise<WithId<CommentDoc>[]> {
  return collection()
    .find(activeFilter({ parentId, status: 'approved' }))
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();
}

export async function listRepliesPaginated(
  parentId: ObjectId,
  params: { page: number; limit: number; skip: number },
): Promise<{ items: WithId<CommentDoc>[]; total: number }> {
  return listComments({
    parentId,
    status: 'approved',
    page: params.page,
    limit: params.limit,
    skip: params.skip,
    sort: { createdAt: 1 },
  });
}

export async function countReplies(parentId: ObjectId): Promise<number> {
  return collection().countDocuments(activeFilter({ parentId, status: 'approved' }));
}

export async function countByArticle(articleId: ObjectId): Promise<number> {
  return collection().countDocuments(activeFilter({ articleId, status: 'approved' }));
}

export async function setStatus(
  id: ObjectId | string,
  status: CommentStatus,
): Promise<WithId<CommentDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  return collection().findOneAndUpdate(
    activeFilter({ _id }),
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
}

export async function toggleLike(
  id: ObjectId | string,
  userId: ObjectId,
): Promise<WithId<CommentDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  const existing = await collection().findOne(activeFilter({ _id }));
  if (!existing) return null;
  const hasLiked = existing.likedBy.some((u) => u.equals(userId));
  await collection().updateOne(
    activeFilter({ _id }),
    hasLiked
      ? { $pull: { likedBy: userId }, $set: { updatedAt: new Date() } }
      : { $addToSet: { likedBy: userId }, $set: { updatedAt: new Date() } },
  );
  return collection().findOne(activeFilter({ _id }));
}

/**
 * Adds a report from `userId` if they haven't already reported this comment.
 * Returns 'added' / 'already_reported' / 'not_found'.
 */
export async function addReport(
  id: ObjectId | string,
  report: CommentReport,
): Promise<'added' | 'already_reported' | 'not_found'> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  const result = await collection().updateOne(
    activeFilter({ _id, 'reportedBy.userId': { $ne: report.userId } }),
    {
      $push: { reportedBy: report },
      $set: { updatedAt: new Date() },
    },
  );
  if (result.matchedCount === 1) return 'added';
  // Either comment is missing OR user already reported. Distinguish:
  const exists = await collection().countDocuments(activeFilter({ _id }), { limit: 1 });
  return exists > 0 ? 'already_reported' : 'not_found';
}

export async function softDelete(id: ObjectId | string): Promise<boolean> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  const result = await collection().updateOne(activeFilter({ _id }), {
    $set: { isDeleted: true, updatedAt: new Date() },
  });
  return result.modifiedCount === 1;
}

export async function hardDelete(id: ObjectId | string): Promise<WithId<CommentDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  return collection().findOneAndDelete({ _id });
}

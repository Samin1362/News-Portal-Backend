import { ObjectId, type WithId } from 'mongodb';
import * as commentModel from '../models/comment.model.js';
import * as articleModel from '../models/article.model.js';
import * as userModel from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination } from '../utils/pagination.js';
import { env } from '../config/env.js';
import {
  buildUserMap,
  collectUserIds,
  type UserMap,
} from '../views/comment.view.js';
import type { CommentDoc, CommentReport } from '../models/comment.model.js';
import type {
  CreateCommentBody,
  ListAdminCommentsQuery,
  ListCommentsQuery,
  ReportCommentBody,
} from '../validators/comment.validator.js';

interface Actor {
  id: string;
  role: 'reader' | 'journalist' | 'editor' | 'admin';
  isCommentBlocked: boolean;
}

const FIRST_REPLIES_PER_TOP_LEVEL = 3;

function actorObjectId(actor: Actor): ObjectId {
  return new ObjectId(actor.id);
}

function defaultStatus(): 'pending' | 'approved' {
  return env.COMMENTS_REQUIRE_APPROVAL ? 'pending' : 'approved';
}

async function loadArticleForCommenting(articleId: ObjectId) {
  const article = await articleModel.findById(articleId);
  if (!article) throw AppError.notFound('Article not found');
  if (article.status !== 'published') {
    throw AppError.forbidden('Comments are only allowed on published articles');
  }
  if (!article.isCommentsEnabled) {
    throw AppError.forbidden('Comments are disabled for this article');
  }
  return article;
}

function assertNotCommentBlocked(actor: Actor) {
  if (actor.isCommentBlocked) {
    throw AppError.forbidden('Your commenting privileges have been revoked');
  }
}

// ---- Read paths ----

export interface ArticleCommentsResult {
  items: Array<{
    comment: WithId<CommentDoc>;
    replies: WithId<CommentDoc>[];
    totalReplies: number;
  }>;
  users: UserMap;
  page: number;
  limit: number;
  total: number;
}

export async function listForArticle(
  articleId: ObjectId,
  query: ListCommentsQuery,
): Promise<ArticleCommentsResult> {
  const article = await articleModel.findById(articleId);
  if (!article) throw AppError.notFound('Article not found');

  const { page, limit, skip } = parsePagination(query);
  const result = await commentModel.listTopLevelForArticle(articleId, { page, limit, skip });

  const enriched = await Promise.all(
    result.items.map(async (comment) => {
      const [replies, totalReplies] = await Promise.all([
        commentModel.listFirstReplies(comment._id, FIRST_REPLIES_PER_TOP_LEVEL),
        commentModel.countReplies(comment._id),
      ]);
      return { comment, replies, totalReplies };
    }),
  );

  const allComments: WithId<CommentDoc>[] = [
    ...enriched.map((e) => e.comment),
    ...enriched.flatMap((e) => e.replies),
  ];
  const userIds = collectUserIds(allComments);
  const users = buildUserMap(await userModel.findManyByIds(userIds));

  return { items: enriched, users, page, limit, total: result.total };
}

export interface RepliesResult {
  items: WithId<CommentDoc>[];
  users: UserMap;
  page: number;
  limit: number;
  total: number;
}

export async function listReplies(
  parentId: ObjectId,
  query: ListCommentsQuery,
): Promise<RepliesResult> {
  const parent = await commentModel.findById(parentId);
  if (!parent || parent.status !== 'approved') {
    throw AppError.notFound('Parent comment not found');
  }

  const { page, limit, skip } = parsePagination(query);
  const result = await commentModel.listRepliesPaginated(parentId, { page, limit, skip });

  const userIds = collectUserIds(result.items);
  const users = buildUserMap(await userModel.findManyByIds(userIds));

  return { items: result.items, users, page, limit, total: result.total };
}

// ---- Write paths ----

export async function createOnArticle(
  articleId: ObjectId,
  actor: Actor,
  body: CreateCommentBody,
): Promise<{ comment: WithId<CommentDoc>; users: UserMap }> {
  assertNotCommentBlocked(actor);
  const article = await loadArticleForCommenting(articleId);

  const status = defaultStatus();
  const comment = await commentModel.createComment({
    articleId: article._id,
    userId: actorObjectId(actor),
    content: body.content,
    parentId: null,
    status,
  });

  if (status === 'approved') {
    await articleModel.incrementCounter(article._id, 'commentCount', 1);
  }

  const users = buildUserMap(await userModel.findManyByIds([comment.userId]));
  return { comment, users };
}

export async function createReply(
  parentId: ObjectId,
  actor: Actor,
  body: CreateCommentBody,
): Promise<{ comment: WithId<CommentDoc>; users: UserMap }> {
  assertNotCommentBlocked(actor);

  const parent = await commentModel.findById(parentId);
  if (!parent) throw AppError.notFound('Parent comment not found');
  if (parent.status !== 'approved') {
    throw AppError.forbidden('Cannot reply to a comment that is not approved');
  }
  if (parent.parentId) {
    // Plan supports single-level threading. A reply to a reply is rooted at the
    // top-level comment so the thread stays flat.
    throw AppError.badRequest(
      'Replies to replies are not allowed. Reply to the top-level comment instead.',
    );
  }

  const article = await loadArticleForCommenting(parent.articleId);
  const status = defaultStatus();

  const comment = await commentModel.createComment({
    articleId: article._id,
    userId: actorObjectId(actor),
    content: body.content,
    parentId,
    status,
  });

  if (status === 'approved') {
    await articleModel.incrementCounter(article._id, 'commentCount', 1);
  }

  const users = buildUserMap(await userModel.findManyByIds([comment.userId]));
  return { comment, users };
}

export async function toggleLike(
  commentId: ObjectId,
  actor: Actor,
): Promise<{ comment: WithId<CommentDoc>; users: UserMap }> {
  assertNotCommentBlocked(actor);
  const updated = await commentModel.toggleLike(commentId, actorObjectId(actor));
  if (!updated) throw AppError.notFound('Comment not found');
  const users = buildUserMap(await userModel.findManyByIds([updated.userId]));
  return { comment: updated, users };
}

export async function reportComment(
  commentId: ObjectId,
  actor: Actor,
  body: ReportCommentBody,
): Promise<void> {
  const report: CommentReport = {
    userId: actorObjectId(actor),
    reason: body.reason,
    at: new Date(),
  };
  const result = await commentModel.addReport(commentId, report);
  if (result === 'not_found') throw AppError.notFound('Comment not found');
  if (result === 'already_reported') {
    throw AppError.conflict('You have already reported this comment');
  }
}

export async function deleteOwn(commentId: ObjectId, actor: Actor): Promise<void> {
  const comment = await commentModel.findById(commentId);
  if (!comment) throw AppError.notFound('Comment not found');
  if (comment.userId.toString() !== actor.id) {
    throw AppError.forbidden('You can only delete your own comments');
  }

  const ok = await commentModel.softDelete(commentId);
  if (!ok) throw AppError.notFound('Comment not found');

  if (comment.status === 'approved') {
    await articleModel.incrementCounter(comment.articleId, 'commentCount', -1);
  }
}

// ---- Moderation paths ----

export interface AdminQueueResult {
  items: WithId<CommentDoc>[];
  users: UserMap;
  page: number;
  limit: number;
  total: number;
}

export async function listAdminQueue(
  query: ListAdminCommentsQuery,
): Promise<AdminQueueResult> {
  const { page, limit, skip } = parsePagination(query);
  const result = await commentModel.listComments({
    status: query.status ?? 'pending',
    reportedOnly: query.reported,
    page,
    limit,
    skip,
    sort: { createdAt: -1 },
  });
  const userIds = collectUserIds(result.items);
  const users = buildUserMap(await userModel.findManyByIds(userIds));
  return { items: result.items, users, page, limit, total: result.total };
}

export async function approveComment(
  commentId: ObjectId,
): Promise<{ comment: WithId<CommentDoc>; users: UserMap }> {
  const existing = await commentModel.findById(commentId);
  if (!existing) throw AppError.notFound('Comment not found');

  if (existing.status === 'approved') {
    const users = buildUserMap(await userModel.findManyByIds([existing.userId]));
    return { comment: existing, users };
  }

  const updated = await commentModel.setStatus(commentId, 'approved');
  if (!updated) throw AppError.notFound('Comment not found');

  // We early-returned above when status was already 'approved', so reaching
  // here always means we transitioned from non-approved → approved.
  await articleModel.incrementCounter(existing.articleId, 'commentCount', 1);

  const users = buildUserMap(await userModel.findManyByIds([updated.userId]));
  return { comment: updated, users };
}

export async function rejectComment(
  commentId: ObjectId,
): Promise<{ comment: WithId<CommentDoc>; users: UserMap }> {
  const existing = await commentModel.findById(commentId);
  if (!existing) throw AppError.notFound('Comment not found');

  if (existing.status === 'rejected') {
    const users = buildUserMap(await userModel.findManyByIds([existing.userId]));
    return { comment: existing, users };
  }

  const updated = await commentModel.setStatus(commentId, 'rejected');
  if (!updated) throw AppError.notFound('Comment not found');

  if (existing.status === 'approved') {
    await articleModel.incrementCounter(existing.articleId, 'commentCount', -1);
  }

  const users = buildUserMap(await userModel.findManyByIds([updated.userId]));
  return { comment: updated, users };
}

export async function adminHardDelete(commentId: ObjectId): Promise<void> {
  const removed = await commentModel.hardDelete(commentId);
  if (!removed) throw AppError.notFound('Comment not found');

  if (removed.status === 'approved' && !removed.isDeleted) {
    await articleModel.incrementCounter(removed.articleId, 'commentCount', -1);
  }
}

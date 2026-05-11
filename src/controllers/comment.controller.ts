import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import * as commentService from '../services/comment.service.js';
import * as articleService from '../services/article.service.js';
import { AppError } from '../utils/AppError.js';
import { ok, created, noContent, paginated } from '../views/apiResponse.js';
import {
  toCommentDTO,
  toCommentWithRepliesDTO,
  toCommentListDTO,
  toModerationCommentListDTO,
} from '../views/comment.view.js';
import { toArticleFullDTO } from '../views/article.view.js';
import { buildMeta } from '../utils/pagination.js';
import type {
  ArticleCommentsEnabledBody,
  CreateCommentBody,
  ListAdminCommentsQuery,
  ListCommentsQuery,
  ReportCommentBody,
} from '../validators/comment.validator.js';
import type { ObjectIdParam } from '../validators/common.validator.js';

function requireValidated<T>(req: Request, key: 'body' | 'params' | 'query'): T {
  const value = req.validated?.[key];
  if (value === undefined) {
    throw AppError.badRequest(`Missing validated ${key}`);
  }
  return value as T;
}

function actor(req: Request) {
  if (!req.user) throw AppError.unauthorized('Authentication required');
  return {
    id: req.user.id,
    role: req.user.role,
    isCommentBlocked: req.user.isCommentBlocked,
  };
}

function optionalActorId(req: Request): string | null {
  return req.user ? req.user.id : null;
}

function parseObjectId(id: ObjectId | string): ObjectId {
  return id instanceof ObjectId ? id : new ObjectId(id);
}

// ---- Article-prefix endpoints ----

export async function createCommentOnArticle(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<CreateCommentBody>(req, 'body');
  const result = await commentService.createOnArticle(parseObjectId(id), actor(req), body);
  created(res, toCommentDTO(result.comment, result.users, actor(req).id), 'Comment posted');
}

export async function listCommentsForArticle(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const query = requireValidated<ListCommentsQuery>(req, 'query');
  const result = await commentService.listForArticle(parseObjectId(id), query);
  const currentUserId = optionalActorId(req);
  const items = result.items.map((entry) =>
    toCommentWithRepliesDTO(
      entry.comment,
      entry.replies,
      entry.totalReplies,
      result.users,
      currentUserId,
    ),
  );
  paginated(res, items, buildMeta(result.page, result.limit, result.total));
}

export async function setArticleCommentsEnabled(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<ArticleCommentsEnabledBody>(req, 'body');
  const article = await articleService.setCommentsEnabled(id, body.isCommentsEnabled);
  ok(
    res,
    toArticleFullDTO(article),
    body.isCommentsEnabled ? 'Comments enabled' : 'Comments disabled',
  );
}

// ---- Comment-prefix endpoints ----

export async function createReply(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<CreateCommentBody>(req, 'body');
  const result = await commentService.createReply(parseObjectId(id), actor(req), body);
  created(res, toCommentDTO(result.comment, result.users, actor(req).id), 'Reply posted');
}

export async function listReplies(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const query = requireValidated<ListCommentsQuery>(req, 'query');
  const result = await commentService.listReplies(parseObjectId(id), query);
  const currentUserId = optionalActorId(req);
  paginated(
    res,
    toCommentListDTO(result.items, result.users, currentUserId),
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function toggleLike(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const result = await commentService.toggleLike(parseObjectId(id), actor(req));
  ok(res, toCommentDTO(result.comment, result.users, actor(req).id));
}

export async function reportComment(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<ReportCommentBody>(req, 'body');
  await commentService.reportComment(parseObjectId(id), actor(req), body);
  ok(res, { reported: true }, 'Comment reported');
}

export async function deleteOwn(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  await commentService.deleteOwn(parseObjectId(id), actor(req));
  noContent(res);
}

// ---- Moderation endpoints (editor/admin) ----

export async function approve(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const result = await commentService.approveComment(parseObjectId(id));
  ok(res, toCommentDTO(result.comment, result.users, null), 'Comment approved');
}

export async function reject(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const result = await commentService.rejectComment(parseObjectId(id));
  ok(res, toCommentDTO(result.comment, result.users, null), 'Comment rejected');
}

// ---- Admin /admin/comments endpoints ----

export async function listAdminComments(req: Request, res: Response): Promise<void> {
  const query = requireValidated<ListAdminCommentsQuery>(req, 'query');
  const result = await commentService.listAdminQueue(query);
  paginated(
    res,
    toModerationCommentListDTO(result.items, result.users),
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function adminHardDelete(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  await commentService.adminHardDelete(parseObjectId(id));
  noContent(res);
}

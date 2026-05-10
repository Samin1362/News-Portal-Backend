import type { Request, Response } from 'express';
import * as workflow from '../services/articleWorkflow.service.js';
import { AppError } from '../utils/AppError.js';
import { ok, paginated } from '../views/apiResponse.js';
import { toArticleCardListDTO, toArticleFullDTO } from '../views/article.view.js';
import { buildMeta } from '../utils/pagination.js';
import type {
  FlagsBody,
  QueueQuery,
  RejectBody,
  ScheduleBody,
} from '../validators/article.validator.js';
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
  return { id: req.user.id, role: req.user.role };
}

export async function listQueue(req: Request, res: Response): Promise<void> {
  const query = requireValidated<QueueQuery>(req, 'query');
  const result = await workflow.listQueue(query);
  paginated(
    res,
    toArticleCardListDTO(result.items),
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function submit(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const article = await workflow.submit(id, actor(req));
  ok(res, toArticleFullDTO(article), 'Submitted for review');
}

export async function startReview(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const article = await workflow.startReview(id, actor(req));
  ok(res, toArticleFullDTO(article), 'Review started');
}

export async function approve(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const article = await workflow.approve(id, actor(req));
  ok(res, toArticleFullDTO(article), 'Approved');
}

export async function reject(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<RejectBody>(req, 'body');
  const article = await workflow.reject(id, actor(req), body);
  ok(res, toArticleFullDTO(article), 'Rejected');
}

export async function publish(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const article = await workflow.publish(id, actor(req));
  ok(res, toArticleFullDTO(article), 'Published');
}

export async function schedule(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<ScheduleBody>(req, 'body');
  const article = await workflow.schedule(id, actor(req), body);
  ok(res, toArticleFullDTO(article), 'Scheduled');
}

export async function archive(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const article = await workflow.archive(id, actor(req));
  ok(res, toArticleFullDTO(article), 'Archived');
}

export async function unarchive(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const article = await workflow.unarchive(id, actor(req));
  ok(res, toArticleFullDTO(article), 'Unarchived');
}

export async function setFlags(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<FlagsBody>(req, 'body');
  const article = await workflow.setFlags(id, actor(req), body);
  ok(res, toArticleFullDTO(article), 'Flags updated');
}

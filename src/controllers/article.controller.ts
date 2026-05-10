import type { Request, Response } from 'express';
import * as articleService from '../services/article.service.js';
import { AppError } from '../utils/AppError.js';
import { ok, created, noContent, paginated } from '../views/apiResponse.js';
import { toArticleCardListDTO, toArticleFullDTO } from '../views/article.view.js';
import { buildMeta } from '../utils/pagination.js';
import type {
  CreateArticleBody,
  ListMineQuery,
  UpdateArticleBody,
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

export async function createDraft(req: Request, res: Response): Promise<void> {
  const body = requireValidated<CreateArticleBody>(req, 'body');
  const article = await articleService.createDraft(actor(req), body);
  created(res, toArticleFullDTO(article), 'Draft created');
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const query = requireValidated<ListMineQuery>(req, 'query');
  const result = await articleService.listMine(actor(req), query);
  paginated(
    res,
    toArticleCardListDTO(result.items),
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const article = await articleService.getForActor(id, actor(req));
  ok(res, toArticleFullDTO(article));
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<UpdateArticleBody>(req, 'body');
  const article = await articleService.update(id, actor(req), body);
  ok(res, toArticleFullDTO(article), 'Article updated');
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  await articleService.softRemove(id, actor(req));
  noContent(res);
}

import type { Request, Response } from 'express';
import * as tagService from '../services/tag.service.js';
import { AppError } from '../utils/AppError.js';
import { created, noContent, paginated } from '../views/apiResponse.js';
import { toTagDTO, toTagListDTO } from '../views/tag.view.js';
import { buildMeta } from '../utils/pagination.js';
import type { CreateTagBody, ListTagsQuery } from '../validators/tag.validator.js';
import type { ObjectIdParam } from '../validators/common.validator.js';

function requireValidated<T>(req: Request, key: 'body' | 'params' | 'query'): T {
  const value = req.validated?.[key];
  if (value === undefined) {
    throw AppError.badRequest(`Missing validated ${key}`);
  }
  return value as T;
}

export async function createTag(req: Request, res: Response): Promise<void> {
  const body = requireValidated<CreateTagBody>(req, 'body');
  const tag = await tagService.create(body);
  created(res, toTagDTO(tag), 'Tag created');
}

export async function listTags(req: Request, res: Response): Promise<void> {
  const query = requireValidated<ListTagsQuery>(req, 'query');
  const result = await tagService.listTags(query);
  paginated(
    res,
    toTagListDTO(result.items),
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function deleteTag(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  await tagService.remove(id);
  noContent(res);
}

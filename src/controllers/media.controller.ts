import type { Request, Response } from 'express';
import * as mediaService from '../services/media.service.js';
import { AppError } from '../utils/AppError.js';
import { ok, created, noContent, paginated } from '../views/apiResponse.js';
import { toMediaDTO, toMediaListDTO } from '../views/media.view.js';
import { buildMeta } from '../utils/pagination.js';
import type {
  ListMediaQuery,
  MediaMetadata,
  RegisterMediaBulkBody,
  UpdateMediaBody,
} from '../validators/media.validator.js';
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

export async function register(req: Request, res: Response): Promise<void> {
  const body = requireValidated<MediaMetadata>(req, 'body');
  const media = await mediaService.register(body, actor(req));
  created(res, toMediaDTO(media), 'Media registered');
}

export async function registerBulk(req: Request, res: Response): Promise<void> {
  const body = requireValidated<RegisterMediaBulkBody>(req, 'body');
  const items = await mediaService.registerBulk(body, actor(req));
  created(res, toMediaListDTO(items), `${items.length} media registered`);
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const query = requireValidated<ListMediaQuery>(req, 'query');
  const result = await mediaService.listMine(actor(req), query);
  paginated(
    res,
    toMediaListDTO(result.items),
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const media = await mediaService.getById(id, actor(req));
  ok(res, toMediaDTO(media));
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<UpdateMediaBody>(req, 'body');
  const media = await mediaService.update(id, body, actor(req));
  ok(res, toMediaDTO(media), 'Media updated');
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  await mediaService.remove(id, actor(req));
  noContent(res);
}

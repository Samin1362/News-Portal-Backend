import type { Request, Response } from 'express';
import * as adService from '../services/ad.service.js';
import { AppError } from '../utils/AppError.js';
import { ok, created, noContent, paginated } from '../views/apiResponse.js';
import {
  toAdminAdDTO,
  toAdminAdListDTO,
  toPublicAdListDTO,
} from '../views/ad.view.js';
import { buildMeta } from '../utils/pagination.js';
import type {
  CreateAdBody,
  ListAdsQuery,
  PublicAdsQuery,
  UpdateAdBody,
} from '../validators/ad.validator.js';
import type { ObjectIdParam } from '../validators/common.validator.js';

function requireValidated<T>(req: Request, key: 'body' | 'params' | 'query'): T {
  const value = req.validated?.[key];
  if (value === undefined) {
    throw AppError.badRequest(`Missing validated ${key}`);
  }
  return value as T;
}

// ---- Admin ----

export async function createAd(req: Request, res: Response): Promise<void> {
  const body = requireValidated<CreateAdBody>(req, 'body');
  const ad = await adService.create(body);
  created(res, toAdminAdDTO(ad), 'Ad created');
}

export async function listAds(req: Request, res: Response): Promise<void> {
  const query = requireValidated<ListAdsQuery>(req, 'query');
  const result = await adService.list(query);
  paginated(
    res,
    toAdminAdListDTO(result.items),
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function getAdById(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const ad = await adService.getById(id);
  ok(res, toAdminAdDTO(ad));
}

export async function updateAd(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<UpdateAdBody>(req, 'body');
  const ad = await adService.update(id, body);
  ok(res, toAdminAdDTO(ad), 'Ad updated');
}

export async function deleteAd(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  await adService.remove(id);
  noContent(res);
}

// ---- Public ----

export async function listPublicAds(req: Request, res: Response): Promise<void> {
  const query = requireValidated<PublicAdsQuery>(req, 'query');
  const items = await adService.listActiveByPlacement(query);
  ok(res, toPublicAdListDTO(items));
}

export async function clickAd(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<ObjectIdParam>(req, 'params');
  const result = await adService.clickAd(id);
  ok(res, result);
}

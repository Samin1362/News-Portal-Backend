import { ObjectId, type WithId } from 'mongodb';
import * as adModel from '../models/ad.model.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination } from '../utils/pagination.js';
import { logger } from '../utils/logger.js';
import type { AdDoc } from '../models/ad.model.js';
import type {
  CreateAdBody,
  ListAdsQuery,
  PublicAdsQuery,
  UpdateAdBody,
} from '../validators/ad.validator.js';

// ---- Admin paths ----

export async function create(body: CreateAdBody): Promise<WithId<AdDoc>> {
  return adModel.createAd({
    name: body.name,
    placement: body.placement,
    imageUrl: body.imageUrl,
    publicId: body.publicId,
    linkUrl: body.linkUrl,
    altText: body.altText,
    isActive: body.isActive,
    startDate: body.startDate ?? null,
    endDate: body.endDate ?? null,
  });
}

export async function list(query: ListAdsQuery): Promise<{
  items: WithId<AdDoc>[];
  page: number;
  limit: number;
  total: number;
}> {
  const { page, limit, skip } = parsePagination(query);
  const result = await adModel.listAds({
    placement: query.placement,
    isActive: query.isActive,
    page,
    limit,
    skip,
  });
  return { items: result.items, page, limit, total: result.total };
}

export async function getById(id: ObjectId | string): Promise<WithId<AdDoc>> {
  const ad = await adModel.findById(id);
  if (!ad) throw AppError.notFound('Ad not found');
  return ad;
}

export async function update(
  id: ObjectId | string,
  body: UpdateAdBody,
): Promise<WithId<AdDoc>> {
  const patch: adModel.UpdateAdPatch = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.placement !== undefined) patch.placement = body.placement;
  if (body.imageUrl !== undefined) patch.imageUrl = body.imageUrl;
  if (body.publicId !== undefined) patch.publicId = body.publicId;
  if (body.linkUrl !== undefined) patch.linkUrl = body.linkUrl;
  if (body.altText !== undefined) patch.altText = body.altText;
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  if (body.startDate !== undefined) patch.startDate = body.startDate ?? null;
  if (body.endDate !== undefined) patch.endDate = body.endDate ?? null;

  const updated = await adModel.updateAd(id, patch);
  if (!updated) throw AppError.notFound('Ad not found');
  return updated;
}

export async function remove(id: ObjectId | string): Promise<void> {
  const ok = await adModel.softDelete(id);
  if (!ok) throw AppError.notFound('Ad not found');
}

// ---- Public paths ----

export async function listActiveByPlacement(
  query: PublicAdsQuery,
): Promise<WithId<AdDoc>[]> {
  const items = await adModel.getActiveByPlacement(query.placement);

  // Fire-and-forget impression bump — never block / fail the response.
  if (items.length > 0) {
    adModel
      .recordImpressions(items.map((a) => a._id))
      .catch((err) =>
        logger.warn({ err, placement: query.placement }, 'Failed to bump ad impressions'),
      );
  }

  return items;
}

export interface ClickResult {
  id: string;
  linkUrl: string;
}

export async function clickAd(id: ObjectId | string): Promise<ClickResult> {
  const ad = await adModel.recordClick(id);
  if (!ad) throw AppError.notFound('Ad not found');
  return { id: ad._id.toString(), linkUrl: ad.linkUrl };
}

// ---- Cron-driven maintenance ----

/**
 * Daily-cron helper. Deactivates any ad whose endDate has already passed.
 * Returns the number of ads deactivated.
 */
export async function deactivateExpired(): Promise<number> {
  const result = await adModel.deactivateExpired(new Date());
  if (result.count > 0) {
    logger.info({ count: result.count }, 'Expired ads auto-deactivated');
  }
  return result.count;
}

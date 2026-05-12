import type { WithId } from 'mongodb';
import type { AdDoc } from '../models/ad.model.js';
import type { AdPlacement } from '../config/constants.js';

/** Public-facing DTO — hides counters (impressions/clicks) and admin flags. */
export interface PublicAdDTO {
  id: string;
  name: string;
  placement: AdPlacement;
  imageUrl: string;
  linkUrl: string;
  altText: string;
}

/** Admin-facing DTO — full record, used in /ads management endpoints. */
export interface AdminAdDTO extends PublicAdDTO {
  publicId: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

export function toPublicAdDTO(a: WithId<AdDoc>): PublicAdDTO {
  return {
    id: a._id.toString(),
    name: a.name,
    placement: a.placement,
    imageUrl: a.imageUrl,
    linkUrl: a.linkUrl,
    altText: a.altText,
  };
}

export function toAdminAdDTO(a: WithId<AdDoc>): AdminAdDTO {
  return {
    ...toPublicAdDTO(a),
    publicId: a.publicId,
    isActive: a.isActive,
    startDate: a.startDate ? a.startDate.toISOString() : null,
    endDate: a.endDate ? a.endDate.toISOString() : null,
    impressions: a.impressions,
    clicks: a.clicks,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export function toPublicAdListDTO(items: WithId<AdDoc>[]): PublicAdDTO[] {
  return items.map(toPublicAdDTO);
}

export function toAdminAdListDTO(items: WithId<AdDoc>[]): AdminAdDTO[] {
  return items.map(toAdminAdDTO);
}

import type { WithId } from 'mongodb';
import type { MediaDoc } from '../models/media.model.js';
import type { MediaType } from '../config/constants.js';

export interface MediaDTO {
  id: string;
  type: MediaType;
  url: string;
  publicId: string;
  format: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  uploadedBy: string;
  articleId: string | null;
  alt: string | null;
  caption: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toMediaDTO(m: WithId<MediaDoc>): MediaDTO {
  return {
    id: m._id.toString(),
    type: m.type,
    url: m.url,
    publicId: m.publicId,
    format: m.format,
    bytes: m.bytes,
    width: m.width,
    height: m.height,
    duration: m.duration,
    uploadedBy: m.uploadedBy.toString(),
    articleId: m.articleId ? m.articleId.toString() : null,
    alt: m.alt,
    caption: m.caption,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export function toMediaListDTO(items: WithId<MediaDoc>[]): MediaDTO[] {
  return items.map(toMediaDTO);
}

import type { WithId } from 'mongodb';
import type { TagDoc } from '../models/tag.model.js';

export interface TagDTO {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export function toTagDTO(t: WithId<TagDoc>): TagDTO {
  return {
    id: t._id.toString(),
    name: t.name,
    slug: t.slug,
    createdAt: t.createdAt.toISOString(),
  };
}

export function toTagListDTO(ts: WithId<TagDoc>[]): TagDTO[] {
  return ts.map(toTagDTO);
}

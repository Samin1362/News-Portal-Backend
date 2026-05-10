import type { WithId } from 'mongodb';
import type { CategoryDoc } from '../models/category.model.js';

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  bannerUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toCategoryDTO(c: WithId<CategoryDoc>): CategoryDTO {
  return {
    id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    description: c.description,
    bannerUrl: c.bannerUrl,
    order: c.order,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function toCategoryListDTO(cs: WithId<CategoryDoc>[]): CategoryDTO[] {
  return cs.map(toCategoryDTO);
}

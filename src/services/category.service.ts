import type { ObjectId, WithId } from 'mongodb';
import * as categoryModel from '../models/category.model.js';
import { AppError } from '../utils/AppError.js';
import { ensureUniqueSlug, makeSlug } from '../utils/slug.js';
import type { CategoryDoc } from '../models/category.model.js';
import type {
  CreateCategoryBody,
  UpdateCategoryBody,
} from '../validators/category.validator.js';

export async function listCategories(
  options: { includeInactive?: boolean } = {},
): Promise<WithId<CategoryDoc>[]> {
  return categoryModel.listAll({ onlyActive: !options.includeInactive });
}

export async function getBySlug(slug: string): Promise<WithId<CategoryDoc>> {
  const category = await categoryModel.findBySlug(slug);
  if (!category) throw AppError.notFound('Category not found');
  return category;
}

export async function getById(id: ObjectId | string): Promise<WithId<CategoryDoc>> {
  const category = await categoryModel.findById(id);
  if (!category) throw AppError.notFound('Category not found');
  return category;
}

export async function create(body: CreateCategoryBody): Promise<WithId<CategoryDoc>> {
  const baseSlug = body.slug ? makeSlug(body.slug) : makeSlug(body.name);
  const slug = await ensureUniqueSlug(baseSlug, categoryModel.existsBySlug);

  return categoryModel.createCategory({
    name: body.name,
    slug,
    description: body.description ?? '',
    bannerUrl: body.bannerUrl || null,
    order: body.order,
    isActive: body.isActive ?? true,
  });
}

export async function update(
  id: ObjectId | string,
  body: UpdateCategoryBody,
): Promise<WithId<CategoryDoc>> {
  const existing = await getById(id);

  const patch: Partial<CategoryDoc> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.description !== undefined) patch.description = body.description;
  if (body.bannerUrl !== undefined) patch.bannerUrl = body.bannerUrl || null;
  if (body.order !== undefined) patch.order = body.order;
  if (body.isActive !== undefined) patch.isActive = body.isActive;

  if (body.slug !== undefined && body.slug !== existing.slug) {
    const baseSlug = makeSlug(body.slug);
    patch.slug = await ensureUniqueSlug(baseSlug, async (candidate) => {
      if (candidate === existing.slug) return false;
      return categoryModel.existsBySlug(candidate);
    });
  }

  const updated = await categoryModel.updateCategory(id, patch);
  if (!updated) throw AppError.notFound('Category not found');
  return updated;
}

export async function remove(id: ObjectId | string): Promise<void> {
  const existing = await getById(id);
  const articleCount = await categoryModel.countArticlesUsingCategory(existing._id);
  if (articleCount > 0) {
    throw AppError.conflict(
      `Cannot delete: ${articleCount} article(s) reference this category. Reassign them first.`,
    );
  }
  const ok = await categoryModel.deleteCategory(id);
  if (!ok) throw AppError.notFound('Category not found');
}

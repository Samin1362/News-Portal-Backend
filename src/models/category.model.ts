import { ObjectId, type Collection, type Filter, type WithId } from 'mongodb';
import { getDb } from '../config/db.js';
import { COLLECTIONS } from '../config/constants.js';

export interface CategoryDoc {
  _id: ObjectId;
  name: string;
  slug: string;
  description: string;
  bannerUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type NewCategoryInput = Pick<CategoryDoc, 'name' | 'slug'> &
  Partial<Pick<CategoryDoc, 'description' | 'bannerUrl' | 'order' | 'isActive'>>;

export type UpdateCategoryPatch = Partial<
  Omit<CategoryDoc, '_id' | 'slug' | 'createdAt' | 'updatedAt'>
> & { slug?: string };

function collection(): Collection<CategoryDoc> {
  return getDb().collection<CategoryDoc>(COLLECTIONS.CATEGORIES);
}

export async function findById(id: ObjectId | string): Promise<WithId<CategoryDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  return collection().findOne({ _id });
}

export async function findBySlug(slug: string): Promise<WithId<CategoryDoc> | null> {
  return collection().findOne({ slug });
}

export async function existsBySlug(slug: string): Promise<boolean> {
  return (await collection().countDocuments({ slug }, { limit: 1 })) > 0;
}

export interface ListCategoriesParams {
  onlyActive?: boolean;
}

export async function listAll(
  params: ListCategoriesParams = {},
): Promise<WithId<CategoryDoc>[]> {
  const filter: Filter<CategoryDoc> = {};
  if (params.onlyActive) filter.isActive = true;
  return collection().find(filter).sort({ order: 1, name: 1 }).toArray();
}

export async function getNextOrder(): Promise<number> {
  const last = await collection().find({}).sort({ order: -1 }).limit(1).next();
  return (last?.order ?? 0) + 1;
}

export async function createCategory(
  input: NewCategoryInput,
): Promise<WithId<CategoryDoc>> {
  const now = new Date();
  const doc: Omit<CategoryDoc, '_id'> = {
    name: input.name,
    slug: input.slug,
    description: input.description ?? '',
    bannerUrl: input.bannerUrl ?? null,
    order: input.order ?? (await getNextOrder()),
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection().insertOne(doc as CategoryDoc);
  return { ...(doc as CategoryDoc), _id: result.insertedId };
}

export async function updateCategory(
  id: ObjectId | string,
  patch: UpdateCategoryPatch,
): Promise<WithId<CategoryDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  return collection().findOneAndUpdate(
    { _id },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
}

export async function deleteCategory(id: ObjectId | string): Promise<boolean> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  const result = await collection().deleteOne({ _id });
  return result.deletedCount === 1;
}

export async function countAll(): Promise<number> {
  return collection().countDocuments();
}

/**
 * Counts published-or-active articles referencing this category.
 * Lives here (rather than in article.model) so categories can be safely
 * deleted without a hard import on a model that doesn't exist until Phase 4.
 * Returns 0 if the articles collection is empty / not yet created.
 */
export async function countArticlesUsingCategory(
  categoryId: ObjectId | string,
): Promise<number> {
  const _id = typeof categoryId === 'string' ? new ObjectId(categoryId) : categoryId;
  return getDb()
    .collection(COLLECTIONS.ARTICLES)
    .countDocuments({ categoryId: _id, isDeleted: { $ne: true } });
}

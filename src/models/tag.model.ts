import { ObjectId, type Collection, type Filter, type WithId } from 'mongodb';
import { getDb } from '../config/db.js';
import { COLLECTIONS } from '../config/constants.js';

export interface TagDoc {
  _id: ObjectId;
  name: string;
  slug: string;
  createdAt: Date;
}

function collection(): Collection<TagDoc> {
  return getDb().collection<TagDoc>(COLLECTIONS.TAGS);
}

export async function findById(id: ObjectId | string): Promise<WithId<TagDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  return collection().findOne({ _id });
}

export async function findBySlug(slug: string): Promise<WithId<TagDoc> | null> {
  return collection().findOne({ slug });
}

export async function findBySlugs(slugs: string[]): Promise<WithId<TagDoc>[]> {
  if (slugs.length === 0) return [];
  return collection().find({ slug: { $in: slugs } }).toArray();
}

export async function existsBySlug(slug: string): Promise<boolean> {
  return (await collection().countDocuments({ slug }, { limit: 1 })) > 0;
}

export interface ListTagsParams {
  q?: string;
  page: number;
  limit: number;
  skip: number;
}

export async function listTags(
  params: ListTagsParams,
): Promise<{ items: WithId<TagDoc>[]; total: number }> {
  const filter: Filter<TagDoc> = {};
  if (params.q) {
    const escaped = params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = new RegExp(escaped, 'i');
  }

  const cursor = collection().find(filter).sort({ name: 1 }).skip(params.skip).limit(params.limit);
  const [items, total] = await Promise.all([cursor.toArray(), collection().countDocuments(filter)]);
  return { items, total };
}

export async function createTag(name: string, slug: string): Promise<WithId<TagDoc>> {
  const doc: Omit<TagDoc, '_id'> = {
    name,
    slug,
    createdAt: new Date(),
  };
  const result = await collection().insertOne(doc as TagDoc);
  return { ...(doc as TagDoc), _id: result.insertedId };
}

export async function deleteTag(id: ObjectId | string): Promise<boolean> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  const result = await collection().deleteOne({ _id });
  return result.deletedCount === 1;
}

export async function countAll(): Promise<number> {
  return collection().countDocuments();
}

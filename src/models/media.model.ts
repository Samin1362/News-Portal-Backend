import { ObjectId, type Collection, type Filter, type WithId } from 'mongodb';
import { getDb } from '../config/db.js';
import { COLLECTIONS, type MediaType } from '../config/constants.js';

export interface MediaDoc {
  _id: ObjectId;
  type: MediaType;
  url: string;
  publicId: string;
  format: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  uploadedBy: ObjectId;
  articleId: ObjectId | null;
  alt: string | null;
  caption: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateMediaInput = Pick<MediaDoc, 'type' | 'url' | 'publicId' | 'uploadedBy'> &
  Partial<
    Pick<
      MediaDoc,
      'format' | 'bytes' | 'width' | 'height' | 'duration' | 'alt' | 'caption' | 'articleId'
    >
  >;

export type UpdateMediaPatch = Partial<Pick<MediaDoc, 'alt' | 'caption' | 'articleId'>>;

function collection(): Collection<MediaDoc> {
  return getDb().collection<MediaDoc>(COLLECTIONS.MEDIA);
}

function activeFilter(extra: Filter<MediaDoc> = {}): Filter<MediaDoc> {
  return { ...extra, isDeleted: { $ne: true } };
}

export async function findById(id: ObjectId | string): Promise<WithId<MediaDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  return collection().findOne(activeFilter({ _id }));
}

export async function findByPublicId(publicId: string): Promise<WithId<MediaDoc> | null> {
  return collection().findOne(activeFilter({ publicId }));
}

export async function existsByPublicId(publicId: string): Promise<boolean> {
  return (await collection().countDocuments(activeFilter({ publicId }), { limit: 1 })) > 0;
}

export async function createMedia(input: CreateMediaInput): Promise<WithId<MediaDoc>> {
  const now = new Date();
  const doc: Omit<MediaDoc, '_id'> = {
    type: input.type,
    url: input.url,
    publicId: input.publicId,
    format: input.format ?? null,
    bytes: input.bytes ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    duration: input.duration ?? null,
    uploadedBy: input.uploadedBy,
    articleId: input.articleId ?? null,
    alt: input.alt ?? null,
    caption: input.caption ?? null,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection().insertOne(doc as MediaDoc);
  return { ...(doc as MediaDoc), _id: result.insertedId };
}

export async function createManyMedia(inputs: CreateMediaInput[]): Promise<WithId<MediaDoc>[]> {
  if (inputs.length === 0) return [];
  const now = new Date();
  const docs: Omit<MediaDoc, '_id'>[] = inputs.map((input) => ({
    type: input.type,
    url: input.url,
    publicId: input.publicId,
    format: input.format ?? null,
    bytes: input.bytes ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    duration: input.duration ?? null,
    uploadedBy: input.uploadedBy,
    articleId: input.articleId ?? null,
    alt: input.alt ?? null,
    caption: input.caption ?? null,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }));
  const result = await collection().insertMany(docs as MediaDoc[], { ordered: true });
  return docs.map((doc, index) => ({
    ...(doc as MediaDoc),
    _id: result.insertedIds[index]!,
  }));
}

export async function updateMedia(
  id: ObjectId | string,
  patch: UpdateMediaPatch,
): Promise<WithId<MediaDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  return collection().findOneAndUpdate(
    activeFilter({ _id }),
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
}

export async function softDelete(id: ObjectId | string): Promise<boolean> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  const result = await collection().updateOne(activeFilter({ _id }), {
    $set: { isDeleted: true, updatedAt: new Date() },
  });
  return result.modifiedCount === 1;
}

export interface ListMediaParams {
  uploadedBy?: ObjectId;
  type?: MediaType;
  articleId?: ObjectId | null; // pass null to filter for unattached
  page: number;
  limit: number;
  skip: number;
}

export async function listMedia(
  params: ListMediaParams,
): Promise<{ items: WithId<MediaDoc>[]; total: number }> {
  const filter: Filter<MediaDoc> = activeFilter();
  if (params.uploadedBy) filter.uploadedBy = params.uploadedBy;
  if (params.type) filter.type = params.type;
  if (params.articleId !== undefined) filter.articleId = params.articleId;

  const cursor = collection()
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(params.skip)
    .limit(params.limit);
  const [items, total] = await Promise.all([cursor.toArray(), collection().countDocuments(filter)]);
  return { items, total };
}

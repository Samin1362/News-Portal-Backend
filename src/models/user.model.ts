import { ObjectId, type Collection, type Filter, type WithId } from 'mongodb';
import { getDb } from '../config/db.js';
import { COLLECTIONS, type Role } from '../config/constants.js';

export interface UserDoc {
  _id: ObjectId;
  firebaseUid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: Role;
  bio: string;
  isBlocked: boolean;
  isCommentBlocked: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export type NewUserInput = Pick<UserDoc, 'firebaseUid' | 'email' | 'displayName' | 'photoURL'> &
  Partial<Pick<UserDoc, 'role' | 'bio'>>;

export type UpdateUserPatch = Partial<
  Omit<UserDoc, '_id' | 'firebaseUid' | 'createdAt' | 'updatedAt'>
>;

function collection(): Collection<UserDoc> {
  return getDb().collection<UserDoc>(COLLECTIONS.USERS);
}

function activeFilter(extra: Filter<UserDoc> = {}): Filter<UserDoc> {
  return { ...extra, isDeleted: { $ne: true } };
}

export async function findByFirebaseUid(firebaseUid: string): Promise<WithId<UserDoc> | null> {
  return collection().findOne(activeFilter({ firebaseUid }));
}

export async function findByEmail(email: string): Promise<WithId<UserDoc> | null> {
  return collection().findOne(activeFilter({ email: email.toLowerCase() }));
}

export async function findById(id: ObjectId | string): Promise<WithId<UserDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  return collection().findOne(activeFilter({ _id }));
}

/**
 * Bulk lookup for user enrichment (e.g. populating comment authors).
 * Includes soft-deleted users so their displayName/photoURL can still render
 * on historical content. The view layer decides what to expose.
 */
export async function findManyByIds(
  ids: Array<ObjectId | string>,
): Promise<WithId<UserDoc>[]> {
  if (ids.length === 0) return [];
  const objectIds = ids.map((id) => (typeof id === 'string' ? new ObjectId(id) : id));
  return collection()
    .find({ _id: { $in: objectIds } })
    .toArray();
}

export async function createUser(input: NewUserInput): Promise<WithId<UserDoc>> {
  const now = new Date();
  const doc: Omit<UserDoc, '_id'> = {
    firebaseUid: input.firebaseUid,
    email: input.email.toLowerCase(),
    displayName: input.displayName || input.email.split('@')[0]!,
    photoURL: input.photoURL ?? null,
    role: input.role ?? 'reader',
    bio: input.bio ?? '',
    isBlocked: false,
    isCommentBlocked: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
  const result = await collection().insertOne(doc as UserDoc);
  return { ...(doc as UserDoc), _id: result.insertedId };
}

export async function updateUser(
  id: ObjectId | string,
  patch: UpdateUserPatch,
): Promise<WithId<UserDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  const result = await collection().findOneAndUpdate(
    activeFilter({ _id }),
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  return result;
}

export async function touchLastLogin(id: ObjectId): Promise<void> {
  const now = new Date();
  await collection().updateOne(
    activeFilter({ _id: id }),
    { $set: { lastLoginAt: now, updatedAt: now } },
  );
}

export interface ListUsersParams {
  role?: Role;
  q?: string;
  page: number;
  limit: number;
  skip: number;
}

export async function listUsers(
  params: ListUsersParams,
): Promise<{ items: WithId<UserDoc>[]; total: number }> {
  const filter: Filter<UserDoc> = activeFilter();
  if (params.role) filter.role = params.role;
  if (params.q) {
    const escaped = params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escaped, 'i');
    filter.$or = [{ displayName: rx }, { email: rx }];
  }

  const cursor = collection()
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(params.skip)
    .limit(params.limit);

  const [items, total] = await Promise.all([cursor.toArray(), collection().countDocuments(filter)]);
  return { items, total };
}

export async function softDelete(id: ObjectId | string): Promise<boolean> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  const result = await collection().updateOne(activeFilter({ _id }), {
    $set: { isDeleted: true, updatedAt: new Date() },
  });
  return result.modifiedCount === 1;
}

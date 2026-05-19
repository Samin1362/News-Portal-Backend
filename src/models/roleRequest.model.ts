import {
  ObjectId,
  type Collection,
  type Filter,
  type WithId,
} from 'mongodb';
import { getDb } from '../config/db.js';
import {
  COLLECTIONS,
  type Role,
  type RoleRequestStatus,
} from '../config/constants.js';

export interface RoleRequestSubmittedInfo {
  fullName: string;
  displayName: string;
  bio: string;
  expertiseTags: string[];
  sampleLinks: string[];
  motivation: string;
  phone?: string;
  photoPublicId?: string;
  agreedToGuidelinesAt: Date;
  guidelinesVersion: string;
}

export interface RoleRequestDoc {
  _id: ObjectId;
  userId: ObjectId;
  fromRole: Role;
  toRole: Role;
  status: RoleRequestStatus;
  submittedInfo: RoleRequestSubmittedInfo;
  emailVerifiedAt: Date | null;
  emailIpRegion?: string;
  decidedBy: ObjectId | null;
  decidedAt: Date | null;
  decisionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewRoleRequestInput = Omit<
  RoleRequestDoc,
  '_id' | 'createdAt' | 'updatedAt' | 'decidedBy' | 'decidedAt' | 'decisionReason'
>;

function collection(): Collection<RoleRequestDoc> {
  return getDb().collection<RoleRequestDoc>(COLLECTIONS.ROLE_REQUESTS);
}

export async function findById(
  id: ObjectId | string,
): Promise<WithId<RoleRequestDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  return collection().findOne({ _id });
}

export async function findOpenForUser(
  userId: ObjectId,
): Promise<WithId<RoleRequestDoc> | null> {
  return collection().findOne({ userId, status: 'pending' });
}

export async function findLatestForUser(
  userId: ObjectId,
): Promise<WithId<RoleRequestDoc> | null> {
  return collection().findOne({ userId }, { sort: { createdAt: -1 } });
}

export async function createRoleRequest(
  input: NewRoleRequestInput,
): Promise<WithId<RoleRequestDoc>> {
  const now = new Date();
  const doc: Omit<RoleRequestDoc, '_id'> = {
    ...input,
    decidedBy: null,
    decidedAt: null,
    decisionReason: null,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection().insertOne(doc as RoleRequestDoc);
  return { ...(doc as RoleRequestDoc), _id: result.insertedId };
}

export interface ListRoleRequestsParams {
  status?: RoleRequestStatus;
  page: number;
  limit: number;
  skip: number;
}

export async function listRoleRequests(
  params: ListRoleRequestsParams,
): Promise<{ items: WithId<RoleRequestDoc>[]; total: number }> {
  const filter: Filter<RoleRequestDoc> = {};
  if (params.status) filter.status = params.status;
  const cursor = collection()
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(params.skip)
    .limit(params.limit);
  const [items, total] = await Promise.all([
    cursor.toArray(),
    collection().countDocuments(filter),
  ]);
  return { items, total };
}

export async function transitionStatus(
  id: ObjectId | string,
  next: Extract<RoleRequestStatus, 'approved' | 'rejected' | 'cancelled'>,
  by: ObjectId | null,
  reason: string | null,
): Promise<WithId<RoleRequestDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  const now = new Date();
  const result = await collection().findOneAndUpdate(
    { _id, status: 'pending' },
    {
      $set: {
        status: next,
        decidedBy: by,
        decidedAt: now,
        decisionReason: reason,
        updatedAt: now,
      },
    },
    { returnDocument: 'after' },
  );
  return result;
}

export async function listRecentDecidedForUser(
  userId: ObjectId,
  sinceDays: number,
): Promise<WithId<RoleRequestDoc>[]> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  return collection()
    .find({
      userId,
      status: { $in: ['approved', 'rejected'] },
      decidedAt: { $gte: since },
    })
    .toArray();
}

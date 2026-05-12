import { ObjectId, type Collection, type Filter, type WithId } from 'mongodb';
import { getDb } from '../config/db.js';
import { COLLECTIONS, type AdPlacement } from '../config/constants.js';

export interface AdDoc {
  _id: ObjectId;
  name: string;
  placement: AdPlacement;
  imageUrl: string;
  publicId: string;
  linkUrl: string;
  altText: string;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  impressions: number;
  clicks: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateAdInput = Pick<
  AdDoc,
  'name' | 'placement' | 'imageUrl' | 'publicId' | 'linkUrl' | 'altText'
> &
  Partial<Pick<AdDoc, 'isActive' | 'startDate' | 'endDate'>>;

export type UpdateAdPatch = Partial<
  Pick<
    AdDoc,
    | 'name'
    | 'placement'
    | 'imageUrl'
    | 'publicId'
    | 'linkUrl'
    | 'altText'
    | 'isActive'
    | 'startDate'
    | 'endDate'
  >
>;

function collection(): Collection<AdDoc> {
  return getDb().collection<AdDoc>(COLLECTIONS.ADS);
}

function activeFilter(extra: Filter<AdDoc> = {}): Filter<AdDoc> {
  return { ...extra, isDeleted: { $ne: true } };
}

export async function findById(id: ObjectId | string): Promise<WithId<AdDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  return collection().findOne(activeFilter({ _id }));
}

export async function createAd(input: CreateAdInput): Promise<WithId<AdDoc>> {
  const now = new Date();
  const doc: Omit<AdDoc, '_id'> = {
    name: input.name,
    placement: input.placement,
    imageUrl: input.imageUrl,
    publicId: input.publicId,
    linkUrl: input.linkUrl,
    altText: input.altText,
    isActive: input.isActive ?? true,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    impressions: 0,
    clicks: 0,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection().insertOne(doc as AdDoc);
  return { ...(doc as AdDoc), _id: result.insertedId };
}

export async function updateAd(
  id: ObjectId | string,
  patch: UpdateAdPatch,
): Promise<WithId<AdDoc> | null> {
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

export interface ListAdsParams {
  placement?: AdPlacement;
  isActive?: boolean;
  page: number;
  limit: number;
  skip: number;
}

export async function listAds(
  params: ListAdsParams,
): Promise<{ items: WithId<AdDoc>[]; total: number }> {
  const filter: Filter<AdDoc> = activeFilter();
  if (params.placement) filter.placement = params.placement;
  if (params.isActive !== undefined) filter.isActive = params.isActive;

  const cursor = collection()
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(params.skip)
    .limit(params.limit);
  const [items, total] = await Promise.all([cursor.toArray(), collection().countDocuments(filter)]);
  return { items, total };
}

/**
 * Returns ads currently eligible for display in `placement`: active, not soft-deleted,
 * and within the optional startDate/endDate window. `null` boundaries are treated as
 * "no constraint on this side".
 */
export async function getActiveByPlacement(
  placement: AdPlacement,
  now: Date = new Date(),
): Promise<WithId<AdDoc>[]> {
  return collection()
    .find(
      activeFilter({
        placement,
        isActive: true,
        $and: [
          { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
          { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
        ],
      }),
    )
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Atomically increments `clicks` and returns the updated ad. Used by
 * POST /public/ads/:id/click so the frontend can read the canonical
 * `linkUrl` from the same round-trip.
 */
export async function recordClick(id: ObjectId | string): Promise<WithId<AdDoc> | null> {
  const _id = typeof id === 'string' ? new ObjectId(id) : id;
  return collection().findOneAndUpdate(
    activeFilter({ _id }),
    {
      $inc: { clicks: 1 },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: 'after' },
  );
}

/** Fire-and-forget batch increment of impressions for a list of ad ids. */
export async function recordImpressions(ids: ObjectId[]): Promise<void> {
  if (ids.length === 0) return;
  await collection().updateMany(
    activeFilter({ _id: { $in: ids } }),
    { $inc: { impressions: 1 } },
  );
}

/**
 * Daily-cron helper. Sets `isActive` to `false` on any ad whose `endDate`
 * has already passed. Returns the number of ads deactivated.
 */
export async function deactivateExpired(now: Date = new Date()): Promise<{ count: number }> {
  const result = await collection().updateMany(
    activeFilter({
      isActive: true,
      endDate: { $ne: null, $lt: now },
    }),
    { $set: { isActive: false, updatedAt: now } },
  );
  return { count: result.modifiedCount };
}

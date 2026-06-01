import { getDb } from '../config/db.js';
import { COLLECTIONS, ROLES, type Role } from '../config/constants.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TrafficBucketDTO {
  /** Midnight UTC of the bucket day, ISO string. */
  date: string;
  views: number;
  publishedCount: number;
}

export interface SignupBucketDTO {
  date: string;
  count: number;
  byRole: Record<Role, number>;
}

export interface TopArticleDTO {
  id: string;
  headline: string;
  slug: string;
  viewCount: number;
  commentCount: number;
  publishedAt: string | null;
  categoryId: string;
}

export interface AnalyticsSnapshotDTO {
  windowDays: number;
  traffic: TrafficBucketDTO[];
  signups: SignupBucketDTO[];
  topByViews: TopArticleDTO[];
  topByComments: TopArticleDTO[];
  totals: { views: number; signups: number; published: number };
}

function emptyByRole(): Record<Role, number> {
  return ROLES.reduce(
    (acc, r) => {
      acc[r] = 0;
      return acc;
    },
    {} as Record<Role, number>,
  );
}

function dayKey(d: Date): string {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10);
}

interface TrafficRow {
  _id: string; // YYYY-MM-DD (UTC)
  views: number;
  publishedCount: number;
}

interface TopRow {
  _id: { toString(): string };
  headline: string;
  slug: string;
  viewCount: number;
  commentCount: number;
  publishedAt: Date | null;
  categoryId: { toString(): string };
}

interface SignupRow {
  _id: { day: string; role: Role };
  count: number;
}

function toTopArticle(r: TopRow): TopArticleDTO {
  return {
    id: r._id.toString(),
    headline: r.headline,
    slug: r.slug,
    viewCount: r.viewCount ?? 0,
    commentCount: r.commentCount ?? 0,
    publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
    categoryId: r.categoryId.toString(),
  };
}

/**
 * Computes the analytics snapshot entirely server-side via Mongo aggregation.
 * Replaces the old client-side roll-up that paginated /articles/queue (capped
 * at 500) and /users (capped at 200) — these pipelines see the whole
 * collection, so totals never silently undercount.
 *
 * The window is `windowDays` days ending today (inclusive), bucketed by UTC
 * day to match how the dashboard charts render.
 */
export async function getAnalyticsSnapshot(
  windowDays: number,
  now: Date = new Date(),
): Promise<AnalyticsSnapshotDTO> {
  const db = getDb();
  const articles = db.collection(COLLECTIONS.ARTICLES);
  const users = db.collection(COLLECTIONS.USERS);

  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const windowStart = new Date(todayUtc - (windowDays - 1) * DAY_MS);

  const publishedInWindow = {
    isDeleted: { $ne: true },
    status: 'published',
    publishedAt: { $gte: windowStart },
  };

  const [trafficRows, topByViewsRows, topByCommentsRows, signupRows] =
    await Promise.all([
      articles
        .aggregate<TrafficRow>([
          { $match: publishedInWindow },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$publishedAt',
                  timezone: 'UTC',
                },
              },
              views: { $sum: '$viewCount' },
              publishedCount: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      articles
        .aggregate<TopRow>([
          { $match: publishedInWindow },
          { $sort: { viewCount: -1 } },
          { $limit: 10 },
          {
            $project: {
              headline: 1,
              slug: 1,
              viewCount: 1,
              commentCount: 1,
              publishedAt: 1,
              categoryId: 1,
            },
          },
        ])
        .toArray(),
      articles
        .aggregate<TopRow>([
          { $match: publishedInWindow },
          { $sort: { commentCount: -1 } },
          { $limit: 10 },
          {
            $project: {
              headline: 1,
              slug: 1,
              viewCount: 1,
              commentCount: 1,
              publishedAt: 1,
              categoryId: 1,
            },
          },
        ])
        .toArray(),
      users
        .aggregate<SignupRow>([
          {
            $match: { isDeleted: { $ne: true }, createdAt: { $gte: windowStart } },
          },
          {
            $group: {
              _id: {
                day: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt',
                    timezone: 'UTC',
                  },
                },
                role: '$role',
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

  // --- Traffic buckets (fill every day in the window, zeros where absent) ---
  const trafficByDay = new Map<string, { views: number; publishedCount: number }>();
  for (const r of trafficRows) {
    trafficByDay.set(r._id, {
      views: r.views ?? 0,
      publishedCount: r.publishedCount ?? 0,
    });
  }

  // --- Signup buckets keyed by day ---
  const signupByDay = new Map<string, SignupBucketDTO>();

  const traffic: TrafficBucketDTO[] = [];
  const signups: SignupBucketDTO[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const dayDate = new Date(todayUtc - i * DAY_MS);
    const key = dayKey(dayDate);
    const iso = `${key}T00:00:00.000Z`;

    const t = trafficByDay.get(key) ?? { views: 0, publishedCount: 0 };
    traffic.push({ date: iso, views: t.views, publishedCount: t.publishedCount });

    const bucket: SignupBucketDTO = { date: iso, count: 0, byRole: emptyByRole() };
    signupByDay.set(key, bucket);
    signups.push(bucket);
  }

  for (const r of signupRows) {
    const bucket = signupByDay.get(r._id.day);
    if (!bucket) continue;
    const role = r._id.role;
    bucket.count += r.count;
    if (role in bucket.byRole) bucket.byRole[role] += r.count;
  }

  const totals = {
    views: traffic.reduce((s, b) => s + b.views, 0),
    published: traffic.reduce((s, b) => s + b.publishedCount, 0),
    signups: signups.reduce((s, b) => s + b.count, 0),
  };

  return {
    windowDays,
    traffic,
    signups,
    topByViews: topByViewsRows.map(toTopArticle),
    topByComments: topByCommentsRows.map(toTopArticle),
    totals,
  };
}

import { getDb } from '../config/db.js';
import { COLLECTIONS, type AdPlacement } from '../config/constants.js';

export interface AdLeaderDTO {
  id: string;
  name: string;
  placement: AdPlacement;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface RevenueRollupDTO {
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  activeCount: number;
  inactiveCount: number;
  topByClicks: AdLeaderDTO[];
  topByCtr: AdLeaderDTO[];
}

interface TotalsRow {
  totalImpressions: number;
  totalClicks: number;
  activeCount: number;
  total: number;
}

interface LeaderRow {
  _id: { toString(): string };
  name: string;
  placement: AdPlacement;
  impressions: number;
  clicks: number;
  ctr: number;
}

function toLeader(r: LeaderRow): AdLeaderDTO {
  return {
    id: r._id.toString(),
    name: r.name,
    placement: r.placement,
    impressions: r.impressions ?? 0,
    clicks: r.clicks ?? 0,
    ctr: r.ctr ?? 0,
  };
}

/**
 * Computes the ad-revenue roll-up server-side via Mongo aggregation across
 * every (non-deleted) ad — replacing the old client-side roll-up that pulled
 * a 500-ad slice and summed it in the browser. Totals are exact regardless of
 * how many campaigns exist.
 */
export async function getRevenueRollup(): Promise<RevenueRollupDTO> {
  const db = getDb();
  const ads = db.collection(COLLECTIONS.ADS);
  const base = { isDeleted: { $ne: true } };

  const ctrExpr = {
    $cond: [
      { $gt: ['$impressions', 0] },
      { $divide: ['$clicks', '$impressions'] },
      0,
    ],
  };

  const [totalsRows, topByClicks, topByCtr] = await Promise.all([
    ads
      .aggregate<TotalsRow>([
        { $match: base },
        {
          $group: {
            _id: null,
            totalImpressions: { $sum: '$impressions' },
            totalClicks: { $sum: '$clicks' },
            activeCount: { $sum: { $cond: ['$isActive', 1, 0] } },
            total: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    ads
      .aggregate<LeaderRow>([
        { $match: base },
        { $sort: { clicks: -1 } },
        { $limit: 5 },
        {
          $project: {
            name: 1,
            placement: 1,
            impressions: 1,
            clicks: 1,
            ctr: ctrExpr,
          },
        },
      ])
      .toArray(),
    ads
      .aggregate<LeaderRow>([
        { $match: { ...base, impressions: { $gt: 0 } } },
        { $addFields: { ctr: ctrExpr } },
        { $sort: { ctr: -1 } },
        { $limit: 5 },
        {
          $project: {
            name: 1,
            placement: 1,
            impressions: 1,
            clicks: 1,
            ctr: 1,
          },
        },
      ])
      .toArray(),
  ]);

  const totals = totalsRows[0];
  const totalImpressions = totals?.totalImpressions ?? 0;
  const totalClicks = totals?.totalClicks ?? 0;
  const activeCount = totals?.activeCount ?? 0;
  const inactiveCount = (totals?.total ?? 0) - activeCount;
  const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  return {
    totalImpressions,
    totalClicks,
    averageCtr,
    activeCount,
    inactiveCount,
    topByClicks: topByClicks.map(toLeader),
    topByCtr: topByCtr.map(toLeader),
  };
}

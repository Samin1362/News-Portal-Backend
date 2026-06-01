import type { Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { ok } from '../views/apiResponse.js';
import { getAnalyticsSnapshot } from '../services/analytics.service.js';
import { getRevenueRollup } from '../services/revenue.service.js';
import type { AnalyticsQuery } from '../validators/analytics.validator.js';

function requireValidated<T>(req: Request, key: 'body' | 'params' | 'query'): T {
  const value = req.validated?.[key];
  if (value === undefined) {
    throw AppError.badRequest(`Missing validated ${key}`);
  }
  return value as T;
}

export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const { window } = requireValidated<AnalyticsQuery>(req, 'query');
  const snapshot = await getAnalyticsSnapshot(window);
  ok(res, snapshot);
}

export async function getRevenue(_req: Request, res: Response): Promise<void> {
  const rollup = await getRevenueRollup();
  ok(res, rollup);
}

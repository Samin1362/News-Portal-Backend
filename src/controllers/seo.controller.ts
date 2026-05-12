import type { Request, Response } from 'express';
import * as seoService from '../services/seo.service.js';
import { AppError } from '../utils/AppError.js';
import { ok, textResponse, xmlResponse } from '../views/apiResponse.js';
import type { PublicSlugParam } from '../validators/public.validator.js';

const ONE_HOUR_SECONDS = 60 * 60;

function requireValidated<T>(req: Request, key: 'body' | 'params' | 'query'): T {
  const value = req.validated?.[key];
  if (value === undefined) {
    throw AppError.badRequest(`Missing validated ${key}`);
  }
  return value as T;
}

export async function sitemap(_req: Request, res: Response): Promise<void> {
  const xml = await seoService.buildSitemap();
  xmlResponse(res, xml, ONE_HOUR_SECONDS);
}

export async function robots(_req: Request, res: Response): Promise<void> {
  const txt = seoService.buildRobotsTxt();
  textResponse(res, txt, ONE_HOUR_SECONDS);
}

export async function articleOg(req: Request, res: Response): Promise<void> {
  const { slug } = requireValidated<PublicSlugParam>(req, 'params');
  const payload = await seoService.buildArticleOg(slug);
  ok(res, payload);
}

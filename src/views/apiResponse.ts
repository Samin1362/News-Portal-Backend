import type { Response } from 'express';
import type { ApiResponse, PaginationMeta } from '../types/api.js';

export function ok<T>(res: Response, data: T, message?: string): Response {
  const body: ApiResponse<T> = { success: true, data, ...(message ? { message } : {}) };
  return res.status(200).json(body);
}

export function created<T>(res: Response, data: T, message = 'Created'): Response {
  const body: ApiResponse<T> = { success: true, data, message };
  return res.status(201).json(body);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function paginated<T>(
  res: Response,
  data: T,
  meta: PaginationMeta,
  message?: string,
): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
    meta,
    ...(message ? { message } : {}),
  };
  return res.status(200).json(body);
}

/**
 * Sends a raw XML payload with the appropriate content type and optional
 * cache-control. Used by SEO endpoints (sitemap) that can't return JSON.
 */
export function xmlResponse(
  res: Response,
  xml: string,
  cacheSeconds = 0,
): Response {
  res.set('Content-Type', 'application/xml; charset=utf-8');
  if (cacheSeconds > 0) {
    res.set('Cache-Control', `public, max-age=${cacheSeconds}`);
  }
  return res.status(200).send(xml);
}

/**
 * Sends a raw plain-text payload (e.g. robots.txt) with content type and
 * optional cache-control.
 */
export function textResponse(
  res: Response,
  text: string,
  cacheSeconds = 0,
): Response {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  if (cacheSeconds > 0) {
    res.set('Cache-Control', `public, max-age=${cacheSeconds}`);
  }
  return res.status(200).send(text);
}

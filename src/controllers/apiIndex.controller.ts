import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { buildApiIndexHtml } from '../views/apiIndex.view.js';
import { htmlResponse } from '../views/apiResponse.js';

const FIVE_MINUTES_SECONDS = 5 * 60;

/**
 * Renders the landing HTML at GET `/`. Lists every endpoint grouped by
 * feature with method, path, auth gate, and description.
 *
 * The base URL is derived from `req` so the rendered links work whether
 * the service is hit at localhost, an onrender.com URL, or a custom domain.
 * Falls back to `env.PUBLIC_BASE_URL` only when host headers are absent.
 */
export function renderApiIndex(req: Request, res: Response): void {
  const host = req.get('host');
  const protocol = req.protocol || 'https';
  const baseUrl = host
    ? `${protocol}://${host}`
    : env.PUBLIC_BASE_URL.replace(/\/$/, '');
  htmlResponse(res, buildApiIndexHtml(baseUrl), FIVE_MINUTES_SECONDS);
}

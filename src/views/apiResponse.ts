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
  items: T[],
  meta: PaginationMeta,
  message?: string,
): Response {
  const body: ApiResponse<T[]> = {
    success: true,
    data: items,
    meta,
    ...(message ? { message } : {}),
  };
  return res.status(200).json(body);
}

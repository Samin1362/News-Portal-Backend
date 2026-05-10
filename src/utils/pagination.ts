import type { PaginationMeta } from '../types/api.js';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(input: { page?: number; limit?: number }): PaginationParams {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(input.limit ?? 20)));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: limit === 0 ? 0 : Math.ceil(total / limit),
  };
}

import type { ObjectId, WithId } from 'mongodb';
import * as tagModel from '../models/tag.model.js';
import { AppError } from '../utils/AppError.js';
import { ensureUniqueSlug, makeSlug } from '../utils/slug.js';
import { parsePagination } from '../utils/pagination.js';
import type { TagDoc } from '../models/tag.model.js';
import type { CreateTagBody, ListTagsQuery } from '../validators/tag.validator.js';

export async function create(body: CreateTagBody): Promise<WithId<TagDoc>> {
  const baseSlug = makeSlug(body.name);
  const existing = await tagModel.findBySlug(baseSlug);
  if (existing) {
    throw AppError.conflict('Tag with this name already exists');
  }
  const slug = await ensureUniqueSlug(baseSlug, tagModel.existsBySlug);
  return tagModel.createTag(body.name.trim(), slug);
}

export async function listTags(query: ListTagsQuery): Promise<{
  items: WithId<TagDoc>[];
  page: number;
  limit: number;
  total: number;
}> {
  const { page, limit, skip } = parsePagination(query);
  const result = await tagModel.listTags({ q: query.q, page, limit, skip });
  return { items: result.items, page, limit, total: result.total };
}

export async function remove(id: ObjectId | string): Promise<void> {
  const ok = await tagModel.deleteTag(id);
  if (!ok) throw AppError.notFound('Tag not found');
}

/**
 * Used by article service in Phase 4: takes free-form tag names supplied by
 * journalists, finds existing matches by slug, creates the missing ones, and
 * returns the slugs of every tag (existing + newly created). Articles store
 * tag slugs (not ObjectIds) for cheap reads.
 */
export async function findOrCreateMany(names: string[]): Promise<string[]> {
  const cleaned = names
    .map((n) => n.trim())
    .filter((n) => n.length > 0 && n.length <= 60);
  if (cleaned.length === 0) return [];

  // Build name → slug map (de-duplicated by slug)
  const pairs = new Map<string, string>();
  for (const name of cleaned) {
    const slug = makeSlug(name);
    if (!pairs.has(slug)) pairs.set(slug, name);
  }

  const slugs = [...pairs.keys()];
  const existing = await tagModel.findBySlugs(slugs);
  const existingSlugs = new Set(existing.map((t) => t.slug));

  for (const slug of slugs) {
    if (!existingSlugs.has(slug)) {
      try {
        await tagModel.createTag(pairs.get(slug)!, slug);
      } catch (err) {
        // Ignore duplicate-key races; another request may have created it.
        if ((err as { code?: number }).code !== 11000) throw err;
      }
    }
  }

  return slugs;
}

import { ObjectId, type WithId } from 'mongodb';
import * as mediaModel from '../models/media.model.js';
import * as articleModel from '../models/article.model.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination } from '../utils/pagination.js';
import type { MediaDoc } from '../models/media.model.js';
import type {
  ListMediaQuery,
  MediaMetadata,
  RegisterMediaBulkBody,
  UpdateMediaBody,
} from '../validators/media.validator.js';

interface Actor {
  id: string;
  role: 'reader' | 'journalist' | 'editor' | 'admin';
}

function actorObjectId(actor: Actor): ObjectId {
  return new ObjectId(actor.id);
}

function isAdmin(actor: Actor): boolean {
  return actor.role === 'admin';
}

function assertOwnerOrAdmin(media: WithId<MediaDoc>, actor: Actor): void {
  if (isAdmin(actor)) return;
  if (media.uploadedBy.toString() !== actor.id) {
    throw AppError.forbidden('You can only access your own media');
  }
}

async function assertArticleAttachable(
  articleId: ObjectId,
  actor: Actor,
): Promise<void> {
  const article = await articleModel.findById(articleId);
  if (!article) throw AppError.badRequest('articleId does not refer to an existing article');
  if (isAdmin(actor) || actor.role === 'editor') return;
  if (article.authorId.toString() !== actor.id) {
    throw AppError.forbidden('Cannot attach to an article you do not own');
  }
}

export async function register(
  metadata: MediaMetadata,
  actor: Actor,
): Promise<WithId<MediaDoc>> {
  const exists = await mediaModel.existsByPublicId(metadata.publicId);
  if (exists) {
    throw AppError.conflict('publicId already registered');
  }
  if (metadata.articleId) {
    await assertArticleAttachable(metadata.articleId, actor);
  }
  return mediaModel.createMedia({
    type: metadata.type,
    url: metadata.url,
    publicId: metadata.publicId,
    format: metadata.format,
    bytes: metadata.bytes,
    width: metadata.width,
    height: metadata.height,
    duration: metadata.duration,
    alt: metadata.alt,
    caption: metadata.caption,
    articleId: metadata.articleId,
    uploadedBy: actorObjectId(actor),
  });
}

export async function registerBulk(
  body: RegisterMediaBulkBody,
  actor: Actor,
): Promise<WithId<MediaDoc>[]> {
  // Pre-flight: ensure no publicId collisions across the batch or against existing records.
  const seen = new Set<string>();
  for (const item of body.items) {
    if (seen.has(item.publicId)) {
      throw AppError.badRequest(`Duplicate publicId in batch: ${item.publicId}`);
    }
    seen.add(item.publicId);
    if (await mediaModel.existsByPublicId(item.publicId)) {
      throw AppError.conflict(`publicId already registered: ${item.publicId}`);
    }
    if (item.articleId) {
      await assertArticleAttachable(item.articleId, actor);
    }
  }

  return mediaModel.createManyMedia(
    body.items.map((item) => ({
      type: item.type,
      url: item.url,
      publicId: item.publicId,
      format: item.format,
      bytes: item.bytes,
      width: item.width,
      height: item.height,
      duration: item.duration,
      alt: item.alt,
      caption: item.caption,
      articleId: item.articleId,
      uploadedBy: actorObjectId(actor),
    })),
  );
}

export async function listMine(
  actor: Actor,
  query: ListMediaQuery,
): Promise<{ items: WithId<MediaDoc>[]; page: number; limit: number; total: number }> {
  const { page, limit, skip } = parsePagination(query);
  const articleFilter =
    query.articleId !== undefined
      ? query.articleId
      : query.unattached === true
        ? null
        : undefined;
  const result = await mediaModel.listMedia({
    uploadedBy: actorObjectId(actor),
    type: query.type,
    articleId: articleFilter,
    page,
    limit,
    skip,
  });
  return { items: result.items, page, limit, total: result.total };
}

export async function getById(
  id: ObjectId | string,
  actor: Actor,
): Promise<WithId<MediaDoc>> {
  const media = await mediaModel.findById(id);
  if (!media) throw AppError.notFound('Media not found');
  assertOwnerOrAdmin(media, actor);
  return media;
}

export async function update(
  id: ObjectId | string,
  body: UpdateMediaBody,
  actor: Actor,
): Promise<WithId<MediaDoc>> {
  const media = await mediaModel.findById(id);
  if (!media) throw AppError.notFound('Media not found');
  assertOwnerOrAdmin(media, actor);

  if (body.articleId !== undefined && body.articleId !== null) {
    await assertArticleAttachable(body.articleId, actor);
  }

  const patch: Parameters<typeof mediaModel.updateMedia>[1] = {};
  if (body.alt !== undefined) patch.alt = body.alt;
  if (body.caption !== undefined) patch.caption = body.caption;
  if (body.articleId !== undefined) patch.articleId = body.articleId; // null detaches

  const updated = await mediaModel.updateMedia(id, patch);
  if (!updated) throw AppError.notFound('Media not found');
  return updated;
}

export async function attachToArticle(
  mediaId: ObjectId | string,
  articleId: ObjectId,
  actor: Actor,
): Promise<WithId<MediaDoc>> {
  return update(mediaId, { articleId }, actor);
}

export async function detachFromArticle(
  mediaId: ObjectId | string,
  actor: Actor,
): Promise<WithId<MediaDoc>> {
  return update(mediaId, { articleId: null }, actor);
}

/**
 * Removes a media record. The Cloudinary asset is NOT deleted by the backend
 * (no credentials on the API). Refuses when the asset is currently attached
 * to a published article — admins should detach first.
 */
export async function remove(id: ObjectId | string, actor: Actor): Promise<void> {
  const media = await mediaModel.findById(id);
  if (!media) throw AppError.notFound('Media not found');
  assertOwnerOrAdmin(media, actor);

  if (media.articleId) {
    const article = await articleModel.findById(media.articleId);
    if (article && article.status === 'published') {
      throw AppError.conflict(
        'Cannot delete media attached to a published article. Detach it first.',
      );
    }
  }

  const ok = await mediaModel.softDelete(id);
  if (!ok) throw AppError.notFound('Media not found');
}

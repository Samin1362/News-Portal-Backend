import { ObjectId, type WithId } from 'mongodb';
import * as articleModel from '../models/article.model.js';
import * as categoryModel from '../models/category.model.js';
import * as tagService from './tag.service.js';
import { AppError } from '../utils/AppError.js';
import { ensureUniqueSlug, makeSlug } from '../utils/slug.js';
import { parsePagination } from '../utils/pagination.js';
import { env } from '../config/env.js';
import type {
  ArticleDoc,
  ArticleHistoryEntry,
  ArticleSeo,
} from '../models/article.model.js';
import type {
  CreateArticleBody,
  ListMineQuery,
  UpdateArticleBody,
} from '../validators/article.validator.js';

interface Actor {
  id: string;
  role: 'reader' | 'journalist' | 'editor' | 'admin';
}

function ownerObjectId(actor: Actor): ObjectId {
  return new ObjectId(actor.id);
}

function buildCanonicalUrl(slug: string): string {
  const base = env.PUBLIC_BASE_URL.replace(/\/$/, '');
  return `${base}/articles/${slug}`;
}

function defaultSeo(
  headline: string,
  summary: string,
  featuredImageUrl: string | null,
  slug: string,
  override?: Partial<ArticleSeo>,
): ArticleSeo {
  return {
    title: override?.title?.trim() || headline,
    description: override?.description?.trim() || summary,
    ogImage: override?.ogImage ?? featuredImageUrl,
    canonicalUrl: override?.canonicalUrl ?? buildCanonicalUrl(slug),
    keywords: override?.keywords ?? [],
  };
}

async function assertCategoryActive(categoryId: ObjectId): Promise<void> {
  const cat = await categoryModel.findById(categoryId);
  if (!cat) throw AppError.badRequest('Category not found');
  if (!cat.isActive) {
    throw AppError.badRequest('Category is inactive');
  }
}

function assertJournalistOwns(article: WithId<ArticleDoc>, actor: Actor): void {
  if (actor.role === 'admin' || actor.role === 'editor') return;
  if (article.authorId.toString() !== actor.id) {
    throw AppError.forbidden('You can only access your own articles');
  }
}

function assertJournalistEditable(article: WithId<ArticleDoc>): void {
  if (article.status !== 'draft' && article.status !== 'rejected') {
    throw AppError.forbidden('Journalists can only edit drafts or rejected articles');
  }
}

export async function createDraft(
  actor: Actor,
  body: CreateArticleBody,
): Promise<WithId<ArticleDoc>> {
  await assertCategoryActive(body.categoryId);

  const baseSlug = makeSlug(body.headline);
  const slug = await ensureUniqueSlug(baseSlug, articleModel.existsBySlug);

  const tagSlugs = body.tags.length > 0 ? await tagService.findOrCreateMany(body.tags) : [];

  const featuredImage = body.featuredImage ?? null;
  const seo = defaultSeo(
    body.headline,
    body.summary,
    featuredImage?.url ?? null,
    slug,
    body.seo,
  );

  const history: ArticleHistoryEntry = {
    action: 'create',
    by: ownerObjectId(actor),
    at: new Date(),
  };

  return articleModel.createArticle(
    {
      headline: body.headline,
      slug,
      summary: body.summary,
      content: body.content,
      authorId: ownerObjectId(actor),
      categoryId: body.categoryId,
      tags: tagSlugs,
      featuredImage,
      gallery: body.gallery,
      videos: body.videos,
      seo,
      isCommentsEnabled: body.isCommentsEnabled,
    },
    history,
  );
}

export async function listMine(
  actor: Actor,
  query: ListMineQuery,
): Promise<{ items: WithId<ArticleDoc>[]; page: number; limit: number; total: number }> {
  const { page, limit, skip } = parsePagination(query);
  const result = await articleModel.listArticles({
    authorId: ownerObjectId(actor),
    status: query.status,
    page,
    limit,
    skip,
  });
  return { items: result.items, page, limit, total: result.total };
}

export async function getForActor(
  id: ObjectId | string,
  actor: Actor,
): Promise<WithId<ArticleDoc>> {
  const article = await articleModel.findById(id);
  if (!article) throw AppError.notFound('Article not found');
  assertJournalistOwns(article, actor);
  return article;
}

export async function update(
  id: ObjectId | string,
  actor: Actor,
  body: UpdateArticleBody,
): Promise<WithId<ArticleDoc>> {
  const article = await articleModel.findById(id);
  if (!article) throw AppError.notFound('Article not found');

  // Role-based gates
  if (actor.role === 'journalist') {
    assertJournalistOwns(article, actor);
    assertJournalistEditable(article);
  } else if (actor.role === 'editor') {
    if (article.status === 'draft') {
      throw AppError.forbidden('Editors cannot edit drafts');
    }
  }
  // admin: no extra restriction

  if (body.categoryId) await assertCategoryActive(body.categoryId);

  const patch: Partial<ArticleDoc> = {};
  if (body.headline !== undefined) patch.headline = body.headline;
  if (body.summary !== undefined) patch.summary = body.summary;
  if (body.content !== undefined) patch.content = body.content;
  if (body.categoryId !== undefined) patch.categoryId = body.categoryId;
  if (body.featuredImage !== undefined) patch.featuredImage = body.featuredImage;
  if (body.gallery !== undefined) patch.gallery = body.gallery;
  if (body.videos !== undefined) patch.videos = body.videos;
  if (body.isCommentsEnabled !== undefined) patch.isCommentsEnabled = body.isCommentsEnabled;

  if (body.tags !== undefined) {
    patch.tags = body.tags.length > 0 ? await tagService.findOrCreateMany(body.tags) : [];
  }

  // Slug regeneration: only when headline changes AND article isn't published yet.
  let nextSlug = article.slug;
  if (body.headline && body.headline !== article.headline && article.status !== 'published') {
    const base = makeSlug(body.headline);
    nextSlug = await ensureUniqueSlug(base, async (candidate) => {
      if (candidate === article.slug) return false;
      return articleModel.existsBySlug(candidate);
    });
    patch.slug = nextSlug;
  }

  // SEO: rebuild with new values where supplied; preserve previous otherwise.
  const featuredImageUrl =
    (patch.featuredImage ?? article.featuredImage)?.url ?? null;
  patch.seo = defaultSeo(
    patch.headline ?? article.headline,
    patch.summary ?? article.summary,
    featuredImageUrl,
    nextSlug,
    body.seo ?? article.seo,
  );

  const history: ArticleHistoryEntry = {
    action: 'update',
    by: ownerObjectId(actor),
    at: new Date(),
  };

  const updated = await articleModel.updateArticle(id, patch, history);
  if (!updated) throw AppError.notFound('Article not found');
  return updated;
}

export async function softRemove(id: ObjectId | string, actor: Actor): Promise<void> {
  const article = await articleModel.findById(id);
  if (!article) throw AppError.notFound('Article not found');

  if (actor.role === 'journalist') {
    assertJournalistOwns(article, actor);
    if (article.status !== 'draft') {
      throw AppError.forbidden('Journalists can only delete drafts');
    }
  }
  // admin: any state allowed

  const history: ArticleHistoryEntry = {
    action: 'soft_delete',
    by: ownerObjectId(actor),
    at: new Date(),
  };

  const ok = await articleModel.softDelete(id, history);
  if (!ok) throw AppError.notFound('Article not found');
}

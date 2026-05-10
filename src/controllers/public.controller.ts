import type { Request, Response } from 'express';
import * as publicService from '../services/public.service.js';
import { AppError } from '../utils/AppError.js';
import { ok, paginated } from '../views/apiResponse.js';
import { toArticleCardListDTO } from '../views/article.view.js';
import { toTagDTO } from '../views/tag.view.js';
import { buildMeta } from '../utils/pagination.js';
import type {
  PublicAuthorParam,
  PublicListQuery,
  PublicSlugParam,
} from '../validators/public.validator.js';

function requireValidated<T>(req: Request, key: 'body' | 'params' | 'query'): T {
  const value = req.validated?.[key];
  if (value === undefined) {
    throw AppError.badRequest(`Missing validated ${key}`);
  }
  return value as T;
}

export async function getHomepage(_req: Request, res: Response): Promise<void> {
  const data = await publicService.getHomepage();
  ok(res, data);
}

export async function getCategoryArticles(req: Request, res: Response): Promise<void> {
  const { slug } = requireValidated<PublicSlugParam>(req, 'params');
  const query = requireValidated<PublicListQuery>(req, 'query');
  const result = await publicService.getCategoryArticles(slug, query);
  paginated(
    res,
    {
      category: result.category,
      articles: toArticleCardListDTO(result.items),
    } as unknown as never,
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function getArticleBySlug(req: Request, res: Response): Promise<void> {
  const { slug } = requireValidated<PublicSlugParam>(req, 'params');
  const result = await publicService.getArticleBySlug(slug);
  ok(res, result);
}

export async function getBreaking(req: Request, res: Response): Promise<void> {
  const query = requireValidated<PublicListQuery>(req, 'query');
  const result = await publicService.getBreaking(query);
  paginated(
    res,
    toArticleCardListDTO(result.items),
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function getTrending(req: Request, res: Response): Promise<void> {
  const query = requireValidated<PublicListQuery>(req, 'query');
  const result = await publicService.getTrending(query);
  paginated(
    res,
    toArticleCardListDTO(result.items),
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function getVideos(req: Request, res: Response): Promise<void> {
  const query = requireValidated<PublicListQuery>(req, 'query');
  const result = await publicService.getVideos(query);
  paginated(
    res,
    toArticleCardListDTO(result.items),
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function getGallery(req: Request, res: Response): Promise<void> {
  const query = requireValidated<PublicListQuery>(req, 'query');
  const result = await publicService.getGallery(query);
  paginated(
    res,
    toArticleCardListDTO(result.items),
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function getByTag(req: Request, res: Response): Promise<void> {
  const { slug } = requireValidated<PublicSlugParam>(req, 'params');
  const query = requireValidated<PublicListQuery>(req, 'query');
  const result = await publicService.getByTag(slug, query);
  paginated(
    res,
    {
      tag: toTagDTO(result.tag),
      articles: toArticleCardListDTO(result.items),
    } as unknown as never,
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function getByAuthor(req: Request, res: Response): Promise<void> {
  const { id } = requireValidated<PublicAuthorParam>(req, 'params');
  const query = requireValidated<PublicListQuery>(req, 'query');
  const result = await publicService.getByAuthor(id, query);
  paginated(
    res,
    toArticleCardListDTO(result.items),
    buildMeta(result.page, result.limit, result.total),
  );
}

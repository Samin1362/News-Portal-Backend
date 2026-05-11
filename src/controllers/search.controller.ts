import type { Request, Response } from 'express';
import * as searchService from '../services/search.service.js';
import { AppError } from '../utils/AppError.js';
import { ok, paginated } from '../views/apiResponse.js';
import { toArticleCardListDTO, toSuggestionListDTO } from '../views/article.view.js';
import { buildMeta } from '../utils/pagination.js';
import type {
  SearchQuery,
  SuggestQuery,
} from '../validators/search.validator.js';

function requireValidated<T>(req: Request, key: 'body' | 'params' | 'query'): T {
  const value = req.validated?.[key];
  if (value === undefined) {
    throw AppError.badRequest(`Missing validated ${key}`);
  }
  return value as T;
}

export async function search(req: Request, res: Response): Promise<void> {
  const query = requireValidated<SearchQuery>(req, 'query');
  const result = await searchService.searchArticles(query);
  paginated(
    res,
    {
      q: query.q,
      items: toArticleCardListDTO(result.items),
      facets: result.facets,
    },
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function suggest(req: Request, res: Response): Promise<void> {
  const query = requireValidated<SuggestQuery>(req, 'query');
  const items = await searchService.searchSuggestions(query);
  ok(res, toSuggestionListDTO(items));
}

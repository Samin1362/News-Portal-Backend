import type { WithId } from 'mongodb';
import * as articleModel from '../models/article.model.js';
import { parsePagination } from '../utils/pagination.js';
import type { ArticleDoc, CategoryFacet } from '../models/article.model.js';
import type { SearchQuery, SuggestQuery } from '../validators/search.validator.js';

export interface SearchResult {
  items: WithId<ArticleDoc>[];
  page: number;
  limit: number;
  total: number;
  facets: { byCategory: CategoryFacet[] };
}

export async function searchArticles(query: SearchQuery): Promise<SearchResult> {
  const { page, limit, skip } = parsePagination(query);
  const result = await articleModel.searchArticles({
    q: query.q,
    categoryId: query.categoryId,
    authorId: query.authorId,
    from: query.from,
    to: query.to,
    page,
    limit,
    skip,
  });
  return {
    items: result.items,
    page,
    limit,
    total: result.total,
    facets: result.facets,
  };
}

export async function searchSuggestions(query: SuggestQuery) {
  return articleModel.suggestHeadlines(query.q, 5);
}

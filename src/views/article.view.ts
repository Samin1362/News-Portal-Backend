import type { WithId } from 'mongodb';
import type {
  ArticleDoc,
  ArticleHistoryEntry,
  ArticleMediaItem,
  ArticleSeo,
  ArticleVideoItem,
} from '../models/article.model.js';

/** Compact card payload — used for lists, related articles, homepage blocks. */
export interface ArticleCardDTO {
  id: string;
  headline: string;
  slug: string;
  summary: string;
  authorId: string;
  categoryId: string;
  tags: string[];
  featuredImage: ArticleMediaItem | null;
  status: ArticleDoc['status'];
  isBreaking: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  publishedAt: string | null;
  scheduledAt: string | null;
  viewCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Full article payload — single article view + author dashboard. */
export interface ArticleFullDTO extends ArticleCardDTO {
  content: string;
  gallery: ArticleMediaItem[];
  videos: ArticleVideoItem[];
  rejectionReason: string | null;
  reviewerId: string | null;
  approverId: string | null;
  history: HistoryDTO[];
  seo: ArticleSeo;
  recentViews: number;
  isCommentsEnabled: boolean;
}

export interface HistoryDTO {
  action: ArticleHistoryEntry['action'];
  by: string | null;
  at: string;
  note?: string;
}

function historyToDTO(h: ArticleHistoryEntry): HistoryDTO {
  return {
    action: h.action,
    by: h.by ? h.by.toString() : null,
    at: h.at.toISOString(),
    ...(h.note ? { note: h.note } : {}),
  };
}

export function toArticleCardDTO(a: WithId<ArticleDoc>): ArticleCardDTO {
  return {
    id: a._id.toString(),
    headline: a.headline,
    slug: a.slug,
    summary: a.summary,
    authorId: a.authorId.toString(),
    categoryId: a.categoryId.toString(),
    tags: a.tags,
    featuredImage: a.featuredImage,
    status: a.status,
    isBreaking: a.isBreaking,
    isFeatured: a.isFeatured,
    isTrending: a.isTrending,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    scheduledAt: a.scheduledAt ? a.scheduledAt.toISOString() : null,
    viewCount: a.viewCount,
    commentCount: a.commentCount,
    shareCount: a.shareCount,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export function toArticleFullDTO(a: WithId<ArticleDoc>): ArticleFullDTO {
  return {
    ...toArticleCardDTO(a),
    content: a.content,
    gallery: a.gallery,
    videos: a.videos,
    rejectionReason: a.rejectionReason,
    reviewerId: a.reviewerId ? a.reviewerId.toString() : null,
    approverId: a.approverId ? a.approverId.toString() : null,
    history: a.history.map(historyToDTO),
    seo: a.seo,
    recentViews: a.recentViews,
    isCommentsEnabled: a.isCommentsEnabled,
  };
}

export function toArticleCardListDTO(items: WithId<ArticleDoc>[]): ArticleCardDTO[] {
  return items.map(toArticleCardDTO);
}

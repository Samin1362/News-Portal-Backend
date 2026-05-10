export const ROLES = ['reader', 'journalist', 'editor', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const ARTICLE_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'published',
  'archived',
] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const AD_PLACEMENTS = [
  'home_top',
  'home_sidebar',
  'home_bottom',
  'article_inline',
  'article_sidebar',
  'sponsored_post',
] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const MEDIA_TYPES = ['image', 'video', 'audio'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const COMMENT_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export const COLLECTIONS = {
  USERS: 'users',
  CATEGORIES: 'categories',
  TAGS: 'tags',
  ARTICLES: 'articles',
  MEDIA: 'media',
  COMMENTS: 'comments',
  ADS: 'ads',
  NOTIFICATIONS: 'notifications',
  NEWSLETTER: 'newsletter_subscriptions',
} as const;

export const API_PREFIX = '/api/v1';

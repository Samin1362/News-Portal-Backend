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

export const ROLE_REQUEST_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
] as const;
export type RoleRequestStatus = (typeof ROLE_REQUEST_STATUSES)[number];

export const OTP_PURPOSES = [
  'role-request',
  'email-change',
  'sensitive-action',
] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

export const EMAIL_LOG_STATUSES = [
  'queued',
  'sent',
  'delivered',
  'bounced',
  'failed',
] as const;
export type EmailLogStatus = (typeof EMAIL_LOG_STATUSES)[number];

export const EMAIL_TEMPLATES = [
  'otp',
  'role-approved',
  'role-rejected',
  'role-changed',
  'account-suspended',
  'account-restored',
  'welcome-reader',
] as const;
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

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
  ROLE_REQUESTS: 'role_requests',
  EMAIL_OTPS: 'email_otps',
  EMAIL_LOG: 'email_log',
} as const;

export const API_PREFIX = '/api/v1';

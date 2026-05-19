import type { Db } from 'mongodb';
import { COLLECTIONS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Registers MongoDB indexes for all collections.
 * Each phase appends its index registrations here.
 */
export async function createIndexes(db: Db): Promise<void> {
  // --- Phase 2: users ---
  const users = db.collection(COLLECTIONS.USERS);
  await users.createIndexes([
    {
      key: { firebaseUid: 1 },
      name: 'firebaseUid_unique_active',
      unique: true,
      partialFilterExpression: { isDeleted: { $eq: false } },
    },
    {
      key: { email: 1 },
      name: 'email_unique_active',
      unique: true,
      partialFilterExpression: { isDeleted: { $eq: false } },
    },
    { key: { role: 1 }, name: 'role_idx' },
    { key: { createdAt: -1 }, name: 'createdAt_desc' },
  ]);

  // --- Phase 3: categories ---
  const categories = db.collection(COLLECTIONS.CATEGORIES);
  await categories.createIndexes([
    { key: { slug: 1 }, name: 'slug_unique', unique: true },
    { key: { order: 1 }, name: 'order_asc' },
    { key: { isActive: 1 }, name: 'isActive_idx' },
  ]);

  // --- Phase 3: tags ---
  const tags = db.collection(COLLECTIONS.TAGS);
  await tags.createIndexes([
    { key: { slug: 1 }, name: 'slug_unique', unique: true },
    { key: { name: 1 }, name: 'name_asc' },
  ]);

  // --- Phase 4: articles ---
  const articles = db.collection(COLLECTIONS.ARTICLES);
  await articles.createIndexes([
    {
      key: { slug: 1 },
      name: 'slug_unique_active',
      unique: true,
      partialFilterExpression: { isDeleted: { $eq: false } },
    },
    { key: { status: 1 }, name: 'status_idx' },
    { key: { categoryId: 1 }, name: 'categoryId_idx' },
    { key: { authorId: 1 }, name: 'authorId_idx' },
    { key: { publishedAt: -1 }, name: 'publishedAt_desc' },
    { key: { scheduledAt: 1 }, name: 'scheduledAt_idx' },
    { key: { tags: 1 }, name: 'tags_idx' },
    { key: { isBreaking: 1, publishedAt: -1 }, name: 'breaking_idx' },
    { key: { isFeatured: 1, publishedAt: -1 }, name: 'featured_idx' },
    // Phase 6 — public read patterns
    { key: { status: 1, publishedAt: -1 }, name: 'status_publishedAt' },
    { key: { status: 1, recentViews: -1 }, name: 'status_trending' },
    {
      key: { headline: 'text', summary: 'text', content: 'text' },
      name: 'article_text_idx',
      weights: { headline: 10, summary: 5, content: 1 },
    },
  ]);

  // --- Phase 5: media ---
  const media = db.collection(COLLECTIONS.MEDIA);
  await media.createIndexes([
    {
      key: { publicId: 1 },
      name: 'publicId_unique_active',
      unique: true,
      partialFilterExpression: { isDeleted: { $eq: false } },
    },
    { key: { uploadedBy: 1, createdAt: -1 }, name: 'uploadedBy_recent' },
    { key: { articleId: 1 }, name: 'articleId_idx' },
    { key: { type: 1 }, name: 'type_idx' },
  ]);

  // --- Phase 8: comments ---
  const comments = db.collection(COLLECTIONS.COMMENTS);
  await comments.createIndexes([
    { key: { articleId: 1, createdAt: -1 }, name: 'articleId_recent' },
    { key: { parentId: 1, createdAt: 1 }, name: 'parentId_oldest' },
    { key: { userId: 1, createdAt: -1 }, name: 'userId_recent' },
    { key: { status: 1, createdAt: -1 }, name: 'status_recent' },
  ]);

  // --- Phase 9: ads ---
  const ads = db.collection(COLLECTIONS.ADS);
  await ads.createIndexes([
    { key: { placement: 1, isActive: 1 }, name: 'placement_isActive' },
    { key: { startDate: 1 }, name: 'startDate_idx' },
    { key: { endDate: 1 }, name: 'endDate_idx' },
  ]);

  // --- §0a: role_requests ---
  const roleRequests = db.collection(COLLECTIONS.ROLE_REQUESTS);
  await roleRequests.createIndexes([
    { key: { userId: 1, status: 1 }, name: 'userId_status' },
    { key: { status: 1, createdAt: -1 }, name: 'status_recent' },
    {
      key: { userId: 1 },
      name: 'one_pending_per_user',
      unique: true,
      partialFilterExpression: { status: 'pending' },
    },
  ]);

  // --- §0a: email_otps (TTL via expiresAt) ---
  const emailOtps = db.collection(COLLECTIONS.EMAIL_OTPS);
  await emailOtps.createIndexes([
    {
      key: { email: 1, purpose: 1, consumed: 1 },
      name: 'email_purpose_consumed',
    },
    { key: { verificationToken: 1 }, name: 'verificationToken_idx', sparse: true },
    { key: { expiresAt: 1 }, name: 'expiresAt_ttl', expireAfterSeconds: 0 },
  ]);

  // --- §0a: email_log ---
  const emailLog = db.collection(COLLECTIONS.EMAIL_LOG);
  await emailLog.createIndexes([
    { key: { relatedUserId: 1, sentAt: -1 }, name: 'relatedUserId_recent' },
    { key: { status: 1, sentAt: -1 }, name: 'status_recent' },
  ]);

  logger.info('MongoDB indexes ensured');
}

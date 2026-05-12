import { env } from '../config/env.js';
import * as articleModel from '../models/article.model.js';
import * as categoryModel from '../models/category.model.js';
import * as userModel from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';
import { API_PREFIX } from '../config/constants.js';
import { LRUCache } from '../utils/lruCache.js';

const SITEMAP_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const SITE_NAME = 'News Portal';
const SITEMAP_CACHE_KEY = 'sitemap';

const sitemapCache = new LRUCache<string, string>({
  maxEntries: 1,
  defaultTTLMs: SITEMAP_CACHE_TTL_MS,
});

function baseUrl(): string {
  return env.PUBLIC_BASE_URL.replace(/\/$/, '');
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  priority?: number;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

function urlsetXml(urls: SitemapUrl[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const u of urls) {
    const parts: string[] = [`<loc>${escapeXml(u.loc)}</loc>`];
    if (u.lastmod) parts.push(`<lastmod>${escapeXml(u.lastmod)}</lastmod>`);
    if (u.changefreq) parts.push(`<changefreq>${u.changefreq}</changefreq>`);
    if (u.priority !== undefined) parts.push(`<priority>${u.priority.toFixed(1)}</priority>`);
    lines.push(`  <url>${parts.join('')}</url>`);
  }

  lines.push('</urlset>');
  return lines.join('\n');
}

export async function buildSitemap(): Promise<string> {
  const cached = sitemapCache.get(SITEMAP_CACHE_KEY);
  if (cached) return cached;

  const base = baseUrl();

  const staticUrls: SitemapUrl[] = [
    { loc: `${base}/`, changefreq: 'hourly', priority: 1.0 },
    { loc: `${base}/gallery`, changefreq: 'daily', priority: 0.6 },
    { loc: `${base}/videos`, changefreq: 'daily', priority: 0.6 },
    { loc: `${base}/search`, changefreq: 'monthly', priority: 0.4 },
  ];

  const [categories, articleEntries] = await Promise.all([
    categoryModel.listAll({ onlyActive: true }),
    articleModel.listAllPublishedForSitemap(),
  ]);

  const categoryUrls: SitemapUrl[] = categories.map((c) => ({
    loc: `${base}/category/${c.slug}`,
    lastmod: c.updatedAt.toISOString(),
    changefreq: 'daily',
    priority: 0.7,
  }));

  const articleUrls: SitemapUrl[] = articleEntries.map((a) => ({
    loc: `${base}/articles/${a.slug}`,
    lastmod: a.updatedAt.toISOString(),
    changefreq: 'weekly',
    priority: 0.8,
  }));

  const xml = urlsetXml([...staticUrls, ...categoryUrls, ...articleUrls]);

  sitemapCache.set(SITEMAP_CACHE_KEY, xml);
  return xml;
}

/** Test/admin hook — flush the sitemap cache so the next request rebuilds. */
export function invalidateSitemapCache(): void {
  sitemapCache.clear();
}

export function buildRobotsTxt(): string {
  const base = baseUrl();
  const sitemapUrl = `${base}${API_PREFIX}/public/sitemap.xml`;
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${sitemapUrl}`,
    '',
  ].join('\n');
}

export interface ArticleOgPayload {
  title: string;
  description: string;
  url: string;
  image: string | null;
  type: 'article';
  siteName: string;
  publishedTime: string | null;
  modifiedTime: string;
  author: string | null;
  section: string | null;
  tags: string[];
  structuredData: Record<string, unknown>;
}

function buildArticleStructuredData(
  article: { headline: string; updatedAt: Date; publishedAt: Date | null; tags: string[]; seo: { title: string; description: string; ogImage: string | null; keywords: string[] }; summary: string; featuredImage: { url: string } | null },
  author: { displayName: string } | null,
  category: { name: string } | null,
  canonicalUrl: string,
): Record<string, unknown> {
  const image =
    article.seo.ogImage ?? article.featuredImage?.url ?? undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.seo.title || article.headline,
    description: article.seo.description || article.summary,
    ...(image ? { image: [image] } : {}),
    datePublished: article.publishedAt ? article.publishedAt.toISOString() : undefined,
    dateModified: article.updatedAt.toISOString(),
    ...(author ? { author: { '@type': 'Person', name: author.displayName } } : {}),
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: canonicalUrl,
    ...(article.seo.keywords.length > 0
      ? { keywords: article.seo.keywords.join(', ') }
      : {}),
    ...(category ? { articleSection: category.name } : {}),
  };
}

export async function buildArticleOg(slug: string): Promise<ArticleOgPayload> {
  const article = await articleModel.findPublishedBySlug(slug);
  if (!article) throw AppError.notFound('Article not found');

  const [author, category] = await Promise.all([
    userModel.findById(article.authorId),
    categoryModel.findById(article.categoryId),
  ]);

  const canonicalUrl =
    article.seo.canonicalUrl ?? `${baseUrl()}/articles/${article.slug}`;

  return {
    title: article.seo.title || article.headline,
    description: article.seo.description || article.summary,
    url: canonicalUrl,
    image: article.seo.ogImage ?? article.featuredImage?.url ?? null,
    type: 'article',
    siteName: SITE_NAME,
    publishedTime: article.publishedAt ? article.publishedAt.toISOString() : null,
    modifiedTime: article.updatedAt.toISOString(),
    author: author ? author.displayName : null,
    section: category ? category.name : null,
    tags: article.tags,
    structuredData: buildArticleStructuredData(article, author, category, canonicalUrl),
  };
}

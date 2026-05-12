/**
 * Renders the public API index page (the HTML shown when a browser hits the
 * service root URL). Pure string concatenation — no template engine.
 */

interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  auth: string;
  description: string;
}

interface EndpointGroup {
  title: string;
  description: string;
  endpoints: Endpoint[];
}

const GROUPS: EndpointGroup[] = [
  {
    title: 'Health',
    description: 'Liveness probe used by Render and any external monitor.',
    endpoints: [
      { method: 'GET', path: '/api/v1/health', auth: 'public', description: 'Returns { status, uptime, db, timestamp }.' },
    ],
  },
  {
    title: 'Authentication',
    description: 'Firebase ID token verification + Mongo user sync.',
    endpoints: [
      { method: 'POST', path: '/api/v1/auth/sync', auth: 'bearer (firebase)', description: 'Verify token and create/update the Mongo user record. Default role = reader.' },
      { method: 'GET',  path: '/api/v1/auth/me',   auth: 'bearer + synced',    description: 'Returns the current user profile DTO.' },
    ],
  },
  {
    title: 'Users',
    description: 'Self-service profile updates + admin user management.',
    endpoints: [
      { method: 'PATCH',  path: '/api/v1/users/me',                   auth: 'self',  description: 'Update displayName / bio / photoURL.' },
      { method: 'GET',    path: '/api/v1/users',                      auth: 'admin', description: 'Paginated list. ?role= ?q= ?page= ?limit=.' },
      { method: 'GET',    path: '/api/v1/users/:id',                  auth: 'admin', description: 'Single user.' },
      { method: 'PATCH',  path: '/api/v1/users/:id/role',             auth: 'admin', description: 'Change role.' },
      { method: 'PATCH',  path: '/api/v1/users/:id/block',            auth: 'admin', description: 'Block / unblock account.' },
      { method: 'PATCH',  path: '/api/v1/users/:id/comment-block',    auth: 'admin', description: 'Revoke / restore commenting privileges.' },
      { method: 'DELETE', path: '/api/v1/users/:id',                  auth: 'admin', description: 'Soft delete user.' },
    ],
  },
  {
    title: 'Categories',
    description: 'News taxonomy. 10 categories are seeded on first boot.',
    endpoints: [
      { method: 'GET',    path: '/api/v1/categories',                  auth: 'public', description: 'List active categories sorted by order. ?includeInactive=true for all.' },
      { method: 'GET',    path: '/api/v1/categories/:slug',            auth: 'public', description: 'Lookup by slug.' },
      { method: 'POST',   path: '/api/v1/categories',                  auth: 'admin',  description: 'Create. slug auto-generated from name.' },
      { method: 'PATCH',  path: '/api/v1/categories/:id',              auth: 'admin',  description: 'Update any subset.' },
      { method: 'DELETE', path: '/api/v1/categories/:id',              auth: 'admin',  description: 'Refuses (409) if articles still reference it.' },
    ],
  },
  {
    title: 'Tags',
    description: 'Free-form tags. Auto-created when journalists submit articles.',
    endpoints: [
      { method: 'GET',    path: '/api/v1/tags',     auth: 'public',         description: 'Paginated; ?q= regex search.' },
      { method: 'POST',   path: '/api/v1/tags',     auth: 'admin/editor',   description: 'Create. slug auto-generated.' },
      { method: 'DELETE', path: '/api/v1/tags/:id', auth: 'admin',          description: 'Hard delete.' },
    ],
  },
  {
    title: 'Articles (CRUD)',
    description: 'Journalist-facing read/write for their own drafts.',
    endpoints: [
      { method: 'POST',   path: '/api/v1/articles',     auth: 'journalist+',                  description: 'Create draft.' },
      { method: 'GET',    path: '/api/v1/articles/me',  auth: 'journalist+',                  description: 'My articles (paginated, optional ?status=).' },
      { method: 'GET',    path: '/api/v1/articles/:id', auth: 'journalist (own) / editor / admin', description: 'Full article with history.' },
      { method: 'PATCH',  path: '/api/v1/articles/:id', auth: 'mixed (see plan)',             description: 'Journalist may edit own draft/rejected; editor any non-draft; admin any.' },
      { method: 'DELETE', path: '/api/v1/articles/:id', auth: 'journalist (own draft) / admin', description: 'Soft delete.' },
    ],
  },
  {
    title: 'Editorial Workflow',
    description: 'State machine: draft → submitted → under_review → approved → published. Plus rejected and archived side-states.',
    endpoints: [
      { method: 'GET',   path: '/api/v1/articles/queue',              auth: 'editor / admin',  description: 'Submitted + under_review queue.' },
      { method: 'POST',  path: '/api/v1/articles/:id/submit',         auth: 'journalist+',     description: 'draft / rejected → submitted.' },
      { method: 'POST',  path: '/api/v1/articles/:id/start-review',   auth: 'editor / admin',  description: 'submitted → under_review.' },
      { method: 'POST',  path: '/api/v1/articles/:id/approve',        auth: 'editor / admin',  description: 'under_review → approved.' },
      { method: 'POST',  path: '/api/v1/articles/:id/reject',         auth: 'editor / admin',  description: 'Reject with reason.' },
      { method: 'POST',  path: '/api/v1/articles/:id/publish',        auth: 'editor / admin',  description: 'approved → published (immediate).' },
      { method: 'POST',  path: '/api/v1/articles/:id/schedule',       auth: 'editor / admin',  description: 'Schedule publish for a future timestamp.' },
      { method: 'POST',  path: '/api/v1/articles/:id/archive',        auth: 'editor / admin',  description: 'published → archived.' },
      { method: 'POST',  path: '/api/v1/articles/:id/unarchive',      auth: 'editor / admin',  description: 'archived → published.' },
      { method: 'PATCH', path: '/api/v1/articles/:id/flags',          auth: 'editor / admin',  description: 'Toggle isBreaking / isFeatured / isTrending.' },
    ],
  },
  {
    title: 'Media',
    description: 'Frontend uploads to Cloudinary; backend stores only URL + publicId strings.',
    endpoints: [
      { method: 'POST',   path: '/api/v1/media',      auth: 'journalist+',  description: 'Register a single asset. URL must be on res.cloudinary.com.' },
      { method: 'POST',   path: '/api/v1/media/bulk', auth: 'journalist+',  description: 'Up to 50 at once. All-or-nothing on duplicate publicId.' },
      { method: 'GET',    path: '/api/v1/media/me',   auth: 'journalist+',  description: 'My media library (paginated, optional ?type= ?articleId= ?unattached=true).' },
      { method: 'GET',    path: '/api/v1/media/:id',  auth: 'owner / admin', description: 'Single media.' },
      { method: 'PATCH',  path: '/api/v1/media/:id',  auth: 'owner / admin', description: 'Edit alt / caption / articleId.' },
      { method: 'DELETE', path: '/api/v1/media/:id',  auth: 'owner / admin', description: 'Soft delete. Refused if attached to a published article.' },
    ],
  },
  {
    title: 'Comments',
    description: 'Single-level threading, likes, reports, and moderation.',
    endpoints: [
      { method: 'POST',   path: '/api/v1/articles/:id/comments',            auth: 'reader+',         description: 'Create top-level comment.' },
      { method: 'GET',    path: '/api/v1/articles/:id/comments',            auth: 'public',          description: 'Paginated with first 3 replies inline + totalReplies.' },
      { method: 'PATCH',  path: '/api/v1/articles/:id/comments-enabled',    auth: 'editor / admin',  description: 'Toggle comments on / off per article.' },
      { method: 'POST',   path: '/api/v1/comments/:id/replies',             auth: 'reader+',         description: 'Reply to a top-level comment.' },
      { method: 'GET',    path: '/api/v1/comments/:id/replies',             auth: 'public',          description: 'Paginated replies for a comment.' },
      { method: 'POST',   path: '/api/v1/comments/:id/like',                auth: 'reader+',         description: 'Idempotent like toggle.' },
      { method: 'POST',   path: '/api/v1/comments/:id/report',              auth: 'reader+',         description: 'Report comment; 409 if already reported.' },
      { method: 'DELETE', path: '/api/v1/comments/:id',                     auth: 'author',          description: 'Soft delete own comment.' },
      { method: 'PATCH',  path: '/api/v1/comments/:id/approve',             auth: 'editor / admin',  description: 'Approve a comment.' },
      { method: 'PATCH',  path: '/api/v1/comments/:id/reject',              auth: 'editor / admin',  description: 'Reject a comment.' },
      { method: 'GET',    path: '/api/v1/admin/comments',                   auth: 'editor / admin',  description: 'Moderation queue. ?status= ?reported=true.' },
      { method: 'DELETE', path: '/api/v1/admin/comments/:id',               auth: 'admin',           description: 'Hard delete.' },
    ],
  },
  {
    title: 'Advertisements',
    description: 'Placement-targeted ads with click + impression tracking.',
    endpoints: [
      { method: 'POST',   path: '/api/v1/ads',                       auth: 'admin',   description: 'Create. Frontend uploads image to Cloudinary first.' },
      { method: 'GET',    path: '/api/v1/ads',                       auth: 'admin',   description: 'Paginated. Optional ?placement= ?isActive=.' },
      { method: 'GET',    path: '/api/v1/ads/:id',                   auth: 'admin',   description: 'Single ad with counters.' },
      { method: 'PATCH',  path: '/api/v1/ads/:id',                   auth: 'admin',   description: 'Update.' },
      { method: 'DELETE', path: '/api/v1/ads/:id',                   auth: 'admin',   description: 'Soft delete.' },
      { method: 'GET',    path: '/api/v1/public/ads',                auth: 'public',  description: 'Required ?placement=. Fire-and-forget impression bump.' },
      { method: 'POST',   path: '/api/v1/public/ads/:id/click',      auth: 'public',  description: 'Returns { id, linkUrl } and increments clicks.' },
    ],
  },
  {
    title: 'Public Reads',
    description: 'Read-only endpoints powering the reader-facing site. Published articles only.',
    endpoints: [
      { method: 'GET', path: '/api/v1/public/homepage',                          auth: 'public', description: 'Composite payload: breaking, topHeadlines, featured, trending, latest, categories, videos, gallery. 30s cache.' },
      { method: 'GET', path: '/api/v1/public/breaking',                          auth: 'public', description: 'isBreaking + published in last 24h.' },
      { method: 'GET', path: '/api/v1/public/trending',                          auth: 'public', description: 'Sorted by recentViews desc.' },
      { method: 'GET', path: '/api/v1/public/videos',                            auth: 'public', description: 'Articles with at least one video.' },
      { method: 'GET', path: '/api/v1/public/gallery',                           auth: 'public', description: 'Articles with at least one gallery image.' },
      { method: 'GET', path: '/api/v1/public/categories/:slug/articles',        auth: 'public', description: '{ category, articles } paginated.' },
      { method: 'GET', path: '/api/v1/public/articles/:slug',                    auth: 'public', description: '{ article, related[6] }. Bumps viewCount + recentViews.' },
      { method: 'GET', path: '/api/v1/public/tags/:slug',                        auth: 'public', description: '{ tag, articles } paginated.' },
      { method: 'GET', path: '/api/v1/public/authors/:id',                       auth: 'public', description: 'Articles by author.' },
    ],
  },
  {
    title: 'Search',
    description: 'Full-text MongoDB text-index search with facets and typeahead.',
    endpoints: [
      { method: 'GET', path: '/api/v1/public/search',         auth: 'public', description: 'Required ?q= (≥ 2). Optional ?categoryId= ?authorId= ?from= ?to= ?page= ?limit=. Returns { q, items, facets }.' },
      { method: 'GET', path: '/api/v1/public/search/suggest', auth: 'public', description: 'Required ?q= (≥ 2). Up to 5 headline suggestions sorted by text score.' },
    ],
  },
  {
    title: 'SEO',
    description: 'XML sitemap, robots.txt, and Open Graph + JSON-LD per article.',
    endpoints: [
      { method: 'GET', path: '/api/v1/public/sitemap.xml',            auth: 'public', description: 'XML sitemap. 1h in-memory cache + Cache-Control: max-age=3600.' },
      { method: 'GET', path: '/api/v1/public/robots.txt',             auth: 'public', description: 'Plain text. Allow: /. Absolute Sitemap URL.' },
      { method: 'GET', path: '/api/v1/public/articles/:slug/og',      auth: 'public', description: 'Open Graph payload with nested JSON-LD NewsArticle structured data.' },
    ],
  },
];

function escapeHtml(value: string): string {
  return value.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}

function methodBadgeColor(method: Endpoint['method']): string {
  switch (method) {
    case 'GET':    return '#16a34a';
    case 'POST':   return '#2563eb';
    case 'PATCH':  return '#ca8a04';
    case 'DELETE': return '#dc2626';
  }
}

function renderEndpoint(ep: Endpoint, baseUrl: string): string {
  const color = methodBadgeColor(ep.method);
  return `
    <tr>
      <td class="method"><span style="background:${color}">${ep.method}</span></td>
      <td class="path"><a href="${escapeHtml(baseUrl + ep.path)}" target="_blank" rel="noopener">${escapeHtml(ep.path)}</a></td>
      <td class="auth">${escapeHtml(ep.auth)}</td>
      <td class="desc">${escapeHtml(ep.description)}</td>
    </tr>`;
}

function renderGroup(group: EndpointGroup, baseUrl: string): string {
  return `
    <section>
      <h2>${escapeHtml(group.title)}</h2>
      <p class="group-desc">${escapeHtml(group.description)}</p>
      <table>
        <thead>
          <tr><th>Method</th><th>Path</th><th>Auth</th><th>Description</th></tr>
        </thead>
        <tbody>
          ${group.endpoints.map((ep) => renderEndpoint(ep, baseUrl)).join('')}
        </tbody>
      </table>
    </section>`;
}

export function buildApiIndexHtml(baseUrl: string): string {
  const totalEndpoints = GROUPS.reduce((sum, g) => sum + g.endpoints.length, 0);
  const safeBase = escapeHtml(baseUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>News Portal API</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
      background: #f3f4f6;
      color: #111827;
      line-height: 1.55;
    }
    .wrap { max-width: 1080px; margin: 0 auto; padding: 32px 24px 80px; }
    header { margin-bottom: 28px; }
    h1 { margin: 0 0 6px; font-size: 28px; }
    .lead { margin: 0 0 12px; color: #4b5563; font-size: 15px; }
    .meta {
      display: flex; flex-wrap: wrap; gap: 8px 16px;
      font-size: 13px; color: #6b7280;
    }
    .meta code {
      background: #fff; padding: 2px 8px; border-radius: 4px;
      border: 1px solid #e5e7eb; color: #111827;
    }
    section {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px 24px;
      margin-top: 18px;
    }
    section h2 {
      margin: 0 0 4px; font-size: 18px; color: #111827;
    }
    .group-desc { margin: 0 0 14px; color: #6b7280; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td {
      text-align: left; vertical-align: top;
      padding: 8px 10px; border-top: 1px solid #f3f4f6;
    }
    th {
      font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em;
      color: #6b7280; border-top: 0; border-bottom: 1px solid #e5e7eb;
      padding-top: 0;
    }
    td.method { white-space: nowrap; width: 90px; }
    td.method span {
      display: inline-block; min-width: 60px; text-align: center;
      color: #fff; font-weight: 600; font-size: 12px;
      padding: 3px 8px; border-radius: 4px; letter-spacing: 0.03em;
    }
    td.path { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    td.path a { color: #1d4ed8; text-decoration: none; }
    td.path a:hover { text-decoration: underline; }
    td.auth { white-space: nowrap; color: #6b7280; font-size: 13px; }
    td.desc { color: #374151; }
    footer {
      margin-top: 32px; padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280; font-size: 13px;
    }
    footer a { color: #1d4ed8; }
    @media (max-width: 720px) {
      .wrap { padding: 20px 12px 60px; }
      td.method, td.auth { white-space: normal; }
      td.path { word-break: break-all; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>News Portal API</h1>
      <p class="lead">
        REST API for a digital news portal. Built with Node.js + Express 5 + MongoDB + Firebase Auth.
        Strict MVC architecture. Cloudinary media handled by the frontend; backend stores only strings.
      </p>
      <div class="meta">
        <span><strong>Base URL:</strong> <code>${safeBase}</code></span>
        <span><strong>Version:</strong> <code>v1</code></span>
        <span><strong>Endpoints:</strong> <code>${totalEndpoints}</code></span>
        <span><strong>Health:</strong> <a href="${safeBase}/api/v1/health" target="_blank" rel="noopener"><code>/api/v1/health</code></a></span>
      </div>
    </header>
    ${GROUPS.map((g) => renderGroup(g, baseUrl)).join('')}
    <footer>
      <p>
        All endpoints return <code>{ success, data, message?, meta? }</code> on success
        or <code>{ success: false, message, code, details? }</code> on error.
        Authenticated routes use <code>Authorization: Bearer &lt;firebase-id-token&gt;</code>.
        See the repository for full API docs.
      </p>
    </footer>
  </div>
</body>
</html>`;
}

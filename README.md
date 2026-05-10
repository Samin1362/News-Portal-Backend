# News Portal — Backend API

REST API for a digital news portal supporting Readers, Journalists, Editors, and Admins. Powers the editorial workflow (draft → submit → review → approve/reject → publish), public news pages, comments, search, advertisements, and SEO endpoints.

The codebase strictly follows the **MVC (Model–View–Controller)** architectural pattern — every feature is split across dedicated layer folders.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js (TypeScript, ES2022, NodeNext modules) |
| Framework | Express 5 |
| Database | MongoDB (native driver `mongodb` v7) |
| Auth | Firebase Authentication (Admin SDK for token verification) |
| Validation | Zod |
| Logging | Pino + pino-http (pretty in dev, JSON in prod) |
| Security | Helmet, CORS, express-rate-limit (Phase 12) |
| Media Storage | Cloudinary — **uploads handled by the frontend**; backend persists only URLs and `publicId` strings |

---

## Architecture (MVC)

| Layer | Purpose | Folder |
|---|---|---|
| **Model** | Collection schema + DB access. Only layer that touches MongoDB. | `src/models/` |
| **View** | JSON serialization (DTOs and the unified API response envelope). | `src/views/` |
| **Controller** | Reads `req`, calls services, formats response via views. Thin. No DB calls. | `src/controllers/` |
| **Service** | Business logic, orchestration of multiple models, external APIs. | `src/services/` |
| **Route** | Express route definitions. Wires `path → middlewares → controller`. | `src/routes/` |
| **Middleware** | auth, RBAC, validate, error handler, rate limit. | `src/middlewares/` |
| **Validator** | Zod schemas per route input (body / params / query). | `src/validators/` |
| **Config** | Env loader, DB client, constants. | `src/config/` |
| **Firebase** | Firebase Admin init (service-account or env triple). | `src/firebase/` |
| **Utils** | Pure helpers: AppError, asyncHandler, logger, slug, pagination. | `src/utils/` |
| **Types** | Cross-layer TypeScript types. | `src/types/` |

### Request flow

```
HTTP request
  → Route → Middleware (auth → rbac → validate)
         → Controller
              → Service
                   → Model (Mongo)
              ← Service
         ← Controller → View (DTO + envelope)
  → HTTP response
```

Errors are thrown as `AppError`, caught by `asyncHandler`, formatted by `error.middleware.ts`.

### Layer discipline

- No DB calls outside `models/`.
- No `res.json(...)` outside `views/`.
- Controllers never import models — only services.
- Services never import controllers.
- Routes never import models — only middlewares + a controller.
- Models never import services.

---

## Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts                 # Zod-validated process.env
│   │   ├── db.ts                  # Mongo client + getDb() + pingDB()
│   │   └── constants.ts           # role / status / placement / collection enums
│   ├── firebase/
│   │   └── firebase.config.ts     # firebase-admin init
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── category.model.ts
│   │   ├── tag.model.ts
│   │   └── indexes.ts             # createIndexes() — called on boot
│   ├── views/
│   │   ├── apiResponse.ts         # ok / created / noContent / paginated
│   │   ├── user.view.ts
│   │   ├── category.view.ts
│   │   └── tag.view.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── category.service.ts
│   │   ├── tag.service.ts
│   │   └── seed.service.ts        # seeds default categories on first boot
│   ├── controllers/
│   │   ├── health.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── category.controller.ts
│   │   └── tag.controller.ts
│   ├── routes/
│   │   ├── index.ts               # mounts all routers under /api/v1
│   │   ├── health.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── category.routes.ts
│   │   └── tag.routes.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts     # verifyFirebase / authenticate / optionalAuth
│   │   ├── rbac.middleware.ts     # requireRole(...)
│   │   ├── blockCheck.middleware.ts
│   │   ├── validate.middleware.ts # Zod schema → req.validated
│   │   ├── notFound.middleware.ts
│   │   └── error.middleware.ts
│   ├── validators/
│   │   ├── common.validator.ts    # objectId, pagination, role
│   │   ├── auth.validator.ts
│   │   ├── user.validator.ts
│   │   ├── category.validator.ts
│   │   └── tag.validator.ts
│   ├── utils/
│   │   ├── AppError.ts
│   │   ├── asyncHandler.ts
│   │   ├── logger.ts
│   │   ├── pagination.ts
│   │   └── slug.ts
│   ├── types/
│   │   ├── express.d.ts           # Request augmentation: user, firebaseUser, validated
│   │   ├── api.ts                 # ApiResponse / Paginated / PaginationMeta
│   │   └── enums.ts
│   ├── app.ts                     # composes Express app
│   └── server.ts                  # entry point
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Quick Start

### 1. Prerequisites

- **Node.js 20+**
- **MongoDB Atlas cluster** (or local `mongod`)
- **Firebase project** with a generated service-account JSON

### 2. Install

```bash
cd backend
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```ini
NODE_ENV=development
PORT=5001
CORS_ORIGINS=http://localhost:3000

# Mongo connection
URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?appName=Cluster0
DB_NAME=news_portal

# Firebase Admin — pick ONE of the two options below
FIREBASE_SERVICE_ACCOUNT_PATH=./news-portal-firebase-project-firebase-adminsdk-fbsvc-XXXXXX.json
# or:
# FIREBASE_PROJECT_ID=...
# FIREBASE_CLIENT_EMAIL=...
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> **Note:** `URI` and `MONGODB_URI` are interchangeable. `DB_USER` and `DB_PASS` may also be set for clarity but are already embedded in the URI.

### 4. Drop in the Firebase service account

Download from **Firebase Console → Project Settings → Service Accounts → Generate new private key**, save it inside `backend/`, and reference it from `.env` as `FIREBASE_SERVICE_ACCOUNT_PATH`. The `.gitignore` already excludes any file matching `*firebase-adminsdk*.json`.

### 5. Run

```bash
npm run dev          # tsx watch mode (auto-restart on save)
# or
npm run build        # compile to dist/
npm start            # run compiled output
```

On first boot you should see:

```
INFO: Firebase Admin initialized
INFO: MongoDB connected           dbName: "news_portal"
INFO: MongoDB indexes ensured
INFO: Default categories seeded   count: 10
INFO: News Portal API listening on http://localhost:5001
```

### 6. Verify

```bash
curl http://localhost:5001/api/v1/health
# → {"success":true,"data":{"status":"ok","uptime":3,"db":"up","timestamp":"..."}}

curl http://localhost:5001/api/v1/categories
# → 10 seeded categories
```

> **Port 5000 on macOS** is occupied by AirPlay Receiver — that's why the default is **5001**. To free 5000: System Settings → General → AirDrop & Handoff → AirPlay Receiver (off).

---

## Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` / `test` / `production` |
| `PORT` | no | `5001` | |
| `CORS_ORIGINS` | no | `http://localhost:3000` | comma-separated whitelist |
| `URI` (or `MONGODB_URI`) | **yes** | — | MongoDB connection string |
| `DB_USER` | no | — | Optional; informational |
| `DB_PASS` | no | — | Optional; informational |
| `DB_NAME` | no | `news_portal` | |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | one of these two | — | Path to service-account JSON (recommended for local dev) |
| `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` | one of these two | — | Inline credentials (recommended for hosted envs) |
| `RATE_LIMIT_GLOBAL_PER_MIN` | no | `300` | Wired in Phase 12 |
| `COMMENTS_REQUIRE_APPROVAL` | no | `false` | Wired in Phase 8 |
| `PUBLIC_BASE_URL` | no | `http://localhost:5001` | Used by sitemap / OG (Phase 10) |

The env loader validates with Zod on startup and exits with a readable error if anything is invalid or missing.

---

## NPM Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Starts the server with `tsx watch` (auto-restart on save) |
| `npm run build` | Compiles `src/` → `dist/` with `tsc` |
| `npm start` | Runs the compiled output |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Placeholder — to be wired in Phase 12 |

---

## API Reference

All endpoints are under the prefix **`/api/v1`**. Authentication uses a Bearer token containing a Firebase ID token.

**Standard response envelope:**

```jsonc
// Success
{ "success": true, "data": <payload>, "message"?: "...", "meta"?: { page, limit, total, totalPages } }

// Error
{ "success": false, "message": "...", "code": "NOT_FOUND", "details"?: ... }
```

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | public | `{ status, uptime, db, timestamp }` |

### Auth (Phase 2)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/sync` | Bearer (Firebase token) | Verifies the token and creates/updates the user record. Default role = `reader`. |
| GET | `/auth/me` | Bearer + synced | Returns the current user's profile DTO. |

### Users (Phase 2)

| Method | Path | Auth | Description |
|---|---|---|---|
| PATCH | `/users/me` | self | Update `displayName` / `bio` / `photoURL` |
| GET | `/users` | admin | Paginated list with `?role=`, `?q=`, `?page=`, `?limit=` |
| GET | `/users/:id` | admin | |
| PATCH | `/users/:id/role` | admin | Body: `{ "role": "journalist" \| "editor" \| "admin" \| "reader" }` |
| PATCH | `/users/:id/block` | admin | Body: `{ "isBlocked": boolean }` |
| PATCH | `/users/:id/comment-block` | admin | Body: `{ "isCommentBlocked": boolean }` |
| DELETE | `/users/:id` | admin | Soft delete |

### Categories (Phase 3)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/categories` | public | Sorted by `order`. `?includeInactive=true` to show inactive too. |
| GET | `/categories/:slug` | public | Lookup by slug |
| POST | `/categories` | admin | Body: `{ name, slug?, description?, bannerUrl?, order?, isActive? }` (slug auto-generated from name when omitted) |
| PATCH | `/categories/:id` | admin | Any subset of body |
| DELETE | `/categories/:id` | admin | Refuses (409) when articles still reference the category |

### Tags (Phase 3)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/tags` | public | Paginated; optional `?q=` regex search by name |
| POST | `/tags` | admin or editor | Body: `{ name }` — slug auto-generated |
| DELETE | `/tags/:id` | admin | |

### Articles (Phase 4)

All article routes require authentication.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/articles` | journalist+ | Create draft. Body: `{ headline, summary, content, categoryId, tags?, featuredImage?, gallery?, videos?, seo?, isCommentsEnabled? }` |
| GET | `/articles/me` | journalist+ | Paginated. Optional `?status=draft` etc. |
| GET | `/articles/queue` | editor / admin | Paginated. Default returns `submitted` + `under_review`; optional `?status=` to narrow |
| GET | `/articles/:id` | journalist (own) / editor / admin | Full article DTO with history |
| PATCH | `/articles/:id` | journalist (own draft/rejected) / editor (any non-draft) / admin (any) | Any subset of fields. Slug auto-regenerates on headline change while not yet published |
| DELETE | `/articles/:id` | journalist (own draft) / admin (any) | Soft delete |
| POST | `/articles/:id/submit` | journalist (own) / editor / admin | `draft` or `rejected` → `submitted` |
| POST | `/articles/:id/start-review` | editor / admin | `submitted` → `under_review` |
| POST | `/articles/:id/approve` | editor / admin | `under_review` → `approved` |
| POST | `/articles/:id/reject` | editor / admin | `under_review` → `rejected`. Body: `{ reason }` |
| POST | `/articles/:id/publish` | editor / admin | `approved` → `published` (sets `publishedAt = now`, clears `scheduledAt`) |
| POST | `/articles/:id/schedule` | editor / admin | Body: `{ scheduledAt: ISO string in future }`. Status stays `approved`; cron flips to `published` when due |
| POST | `/articles/:id/archive` | editor / admin | `published` → `archived` |
| POST | `/articles/:id/unarchive` | editor / admin | `archived` → `published` |
| PATCH | `/articles/:id/flags` | editor / admin | Body: any subset of `{ isBreaking, isFeatured, isTrending }` |

#### Editorial state machine

```
       (journalist)               (editor/admin)            (editor/admin)
draft ────────────► submitted ──────────────► under_review ──────────────► approved ──► published
  ▲                                                  │                          │            │
  │                                                  │                          │            ▼
  └─────── reject (any role) ◄───────────────────────┘                       schedule    archived
                                                                              (future)       │
                                                                                 │            ▼
                                                                                 ▼        (unarchive)
                                                                       cron auto-publish ── back to published
```

Every transition appends an entry to `history[]` atomically (`{ action, by, at, note? }`). System-driven transitions (cron) record `by: null`.

#### Scheduled publishing

`scheduler.service.ts` registers a node-cron job at `* * * * *`. Each tick calls `articleWorkflow.publishScheduledArticles()` which finds approved articles whose `scheduledAt` has passed and atomically transitions them to `published`. The user-visible `publishedAt` is set to the originally-scheduled time, not the cron-fire time.

### Media (Phase 5)

All media routes require authentication. The backend never receives binary data — the frontend uploads directly to Cloudinary using an unsigned upload preset and POSTs the resulting metadata here.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/media` | journalist+ | Register a single uploaded asset. Body: `{ type: 'image'\|'video'\|'audio', url, publicId, format?, bytes?, width?, height?, duration?, alt?, caption?, articleId? }`. The `url` must be a `https://res.cloudinary.com/...` URL |
| POST | `/media/bulk` | journalist+ | Register up to 50 assets at once. Body: `{ items: [...] }`. Whole batch refused on any duplicate `publicId` |
| GET | `/media/me` | journalist+ | Paginated. Optional `?type=`, `?articleId=`, `?unattached=true` |
| GET | `/media/:id` | owner / admin | |
| PATCH | `/media/:id` | owner / admin | Body: any subset of `{ alt, caption, articleId }`. Pass `articleId: null` to detach |
| DELETE | `/media/:id` | owner / admin | Soft delete. Refuses (409) when attached to a published article |

**Cloudinary URL guard:** the validator only accepts URLs matching `^https://res.cloudinary.com/<cloud>/...`. Anything else is rejected with `400 BAD_REQUEST`.

**Article integration:** the `featuredImage`, `gallery`, and `videos` fields on articles continue to store inline `{ url, publicId }` objects — they don't reference media records by id. The media collection serves as the user's media library for tracking; deleting a media record does not modify any article. To prevent dangling references, deletion blocks when the asset is attached to a `published` article.

### Public (Phase 6)

All public endpoints are unauthenticated and return only `published`, non-deleted articles.

| Method | Path | Description |
|---|---|---|
| GET | `/public/homepage` | Composite payload: `{ breaking, topHeadlines, featured, trending, latest, categories: [{ category, articles }], videos, gallery, generatedAt }`. Cached in-memory for 30 s |
| GET | `/public/breaking` | `isBreaking` published in the last 24 h, paginated |
| GET | `/public/trending` | Sorted by `recentViews desc, publishedAt desc` |
| GET | `/public/videos` | Articles where `videos[0]` exists |
| GET | `/public/gallery` | Articles where `gallery[0]` exists |
| GET | `/public/categories/:slug/articles` | `{ category, articles }`, paginated. 404 if category missing or inactive |
| GET | `/public/articles/:slug` | `{ article, related: [up to 6 cards] }`. Increments `viewCount` and `recentViews` (fire-and-forget) |
| GET | `/public/tags/:slug` | `{ tag, articles }`, paginated |
| GET | `/public/authors/:id` | Articles by author, paginated |

All list endpoints accept `?page=` and `?limit=` (default 20, max 100).

**Trending counter:** every successful `GET /public/articles/:slug` fires an async `$inc { viewCount: 1, recentViews: 1 }` against the article. The counter never blocks the response. The `recentViews` value is reset to 0 nightly by the scheduler at `00:00 UTC`.

**Card projection:** all public list endpoints project `content`, `history`, `gallery`, and `videos` out at the MongoDB layer (`CARD_PROJECTION`) so card responses stay small.

---

## Authentication Flow

1. Frontend signs the user in via Firebase Web SDK (email/password, Google, etc.).
2. Frontend retrieves the Firebase **ID token** (`getIdToken()`).
3. Frontend calls `POST /api/v1/auth/sync` with `Authorization: Bearer <idToken>`.
4. Backend verifies the token via `firebase-admin`, finds or creates a Mongo user record, and returns the user DTO.
5. All subsequent authenticated requests include the same Bearer token. The token contains identity claims; the backend always cross-references the Mongo user record (e.g. for `role`, `isBlocked`).

> Tokens are short-lived (~1 hour). The frontend should call `getIdToken()` again to refresh — the SDK handles this automatically when called after expiry.

### Promoting yourself to admin (one-time, after first sync)

The first user is created as `reader`. To bootstrap an admin, after your first `/auth/sync` run this in MongoDB Atlas (or via `mongosh`):

```js
db.users.updateOne(
  { email: "your.email@example.com" },
  { $set: { role: "admin", updatedAt: new Date() } }
)
```

From there, use `PATCH /api/v1/users/:id/role` to promote others.

---

## Roles & RBAC

| Role | Capabilities |
|---|---|
| `reader` | Browse public content, comment, like, report |
| `journalist` | All reader capabilities + create/edit own draft articles, upload media references, submit for review |
| `editor` | All journalist capabilities + review, approve, reject, publish, mark breaking/featured/trending |
| `admin` | Full access — manage users, categories, tags, ads, comments, system config |

Implemented via `requireRole(...roles)` middleware in `src/middlewares/rbac.middleware.ts`.

---

## Cloudinary Strategy (string-only on backend)

Per project requirements, **the backend never receives binary uploads**:

```
[Frontend file picker]
   → uploads directly to Cloudinary using an unsigned upload preset
   → receives { secure_url, public_id, ... }
   → POST /media to the backend with metadata only (Phase 5)
```

The backend stores only strings (`url`, `publicId`, dimensions). This eliminates large request handling, multer/streamifier dependencies, and credential exposure on the API. See Phase 5 in `../backend_plan.md` for the upload flow and orphan-cleanup strategies.

---

## Indexes Summary

Registered in `src/models/indexes.ts`, called from `server.ts` after DB connect.

| Collection | Index |
|---|---|
| `users` | `firebaseUid` unique (partial: `isDeleted=false`), `email` unique (partial: `isDeleted=false`), `role`, `createdAt` desc |
| `categories` | `slug` unique, `order`, `isActive` |
| `tags` | `slug` unique, `name` |
| `articles` | `slug` unique (partial: `isDeleted=false`), `status`, `categoryId`, `authorId`, `publishedAt` desc, `scheduledAt`, `tags`, `(isBreaking, publishedAt)`, `(isFeatured, publishedAt)`, `(status, publishedAt: -1)`, `(status, recentViews: -1)`, text(`headline`+`summary`+`content`) with weights 10/5/1 |
| `media` | `publicId` unique (partial: `isDeleted=false`), `(uploadedBy, createdAt desc)`, `articleId`, `type` |

Soft-delete-aware uniqueness: re-registering after admin removes a user does not collide.

---

## Default Seed Data

On first boot, when the `categories` collection is empty, `seedDefaultCategories()` inserts:

National · Politics · International · Business · Sports · Entertainment · Technology · Lifestyle · Health · Education

(`order` 1-10). The seed is idempotent — subsequent restarts skip it.

---

## Phase Roadmap

The full plan is in `../backend_plan.md`.

| # | Phase | Status |
|---|---|---|
| 1 | Foundation & MVC Skeleton | done |
| 2 | Auth & User Management (Firebase) | done |
| 3 | Categories & Tags | done |
| 4 | Articles & Editorial Workflow | done |
| 5 | Multimedia References (Cloudinary, frontend-driven) | done |
| 6 | Public News Endpoints (homepage, category, article, gallery, video) | done |
| 7 | Search System (text index + filters) | next |
| 8 | Comment System (threaded, moderation) | pending |
| 9 | Advertisement Management | pending |
| 10 | SEO, Sitemap, Open Graph | pending |
| 11 | Notifications & Newsletter (optional) | pending |
| 12 | Performance, Security, Hardening | pending |
| 13 | Deployment & Operations | pending |

Each phase is independently testable. Phases 1-4 are the critical path; the rest can ship incrementally.

---

## Contributing / Conventions

- **TypeScript strict.** All public functions are typed.
- **Validators define types.** Use `z.infer<>` to share schema types between validator, service, controller.
- **Soft-delete where it matters.** Collections include `isDeleted: boolean`. Reads filter on `isDeleted: { $ne: true }`. Unique indexes are partial on `isDeleted=false`.
- **Mongo `_id` is `ObjectId` internally; views serialize as `id` (string).**
- **Standard response shape:** `{ success, data, message?, meta? }` for success, `{ success: false, message, code, details? }` for errors.
- **Pagination:** `?page=&limit=` query parameters; `meta: { page, limit, total, totalPages }` in responses.
- **Adding a new feature** = adding one file in *each* relevant layer (model, view, service, controller, route, validator). No shortcuts.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `Firebase Admin credentials missing` at boot | Set `FIREBASE_SERVICE_ACCOUNT_PATH` or the env triple in `.env` |
| `MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017` | Local Mongo not running — use Atlas, or `brew services start mongodb-community` |
| `403 Forbidden` from `Server: AirTunes/925.5.1` on port 5000 | macOS AirPlay Receiver. Use port 5001, or disable AirPlay Receiver in System Settings |
| `Account not synced. POST /auth/sync first.` (401) | Frontend must call `POST /auth/sync` once after Firebase sign-in before any other authenticated endpoint |
| `Email is already registered to a different account` (409) | A different Firebase UID with the same email already exists in Mongo. Resolve manually in the DB |
| Tag duplicate after rapid requests | `findOrCreateMany` swallows the duplicate-key race; the result is still consistent |

---

## License

ISC (project private — adjust before public release).

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  publicAuthorParamSchema,
  publicListQuerySchema,
  publicSlugParamSchema,
} from '../validators/public.validator.js';
import {
  getArticleBySlug,
  getBreaking,
  getByAuthor,
  getByTag,
  getCategoryArticles,
  getGallery,
  getHomepage,
  getTrending,
  getVideos,
} from '../controllers/public.controller.js';
import searchRoutes from './search.routes.js';

const router = Router();

// All endpoints are public — no authentication required.

// Phase 7: search and typeahead live under /public/search
router.use('/search', searchRoutes);

router.get('/homepage', asyncHandler(getHomepage));

router.get(
  '/breaking',
  validate({ query: publicListQuerySchema }),
  asyncHandler(getBreaking),
);

router.get(
  '/trending',
  validate({ query: publicListQuerySchema }),
  asyncHandler(getTrending),
);

router.get(
  '/videos',
  validate({ query: publicListQuerySchema }),
  asyncHandler(getVideos),
);

router.get(
  '/gallery',
  validate({ query: publicListQuerySchema }),
  asyncHandler(getGallery),
);

router.get(
  '/categories/:slug/articles',
  validate({ params: publicSlugParamSchema, query: publicListQuerySchema }),
  asyncHandler(getCategoryArticles),
);

router.get(
  '/articles/:slug',
  validate({ params: publicSlugParamSchema }),
  asyncHandler(getArticleBySlug),
);

router.get(
  '/tags/:slug',
  validate({ params: publicSlugParamSchema, query: publicListQuerySchema }),
  asyncHandler(getByTag),
);

router.get(
  '/authors/:id',
  validate({ params: publicAuthorParamSchema, query: publicListQuerySchema }),
  asyncHandler(getByAuthor),
);

export default router;

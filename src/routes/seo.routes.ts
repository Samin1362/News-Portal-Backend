import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middlewares/validate.middleware.js';
import { publicSlugParamSchema } from '../validators/public.validator.js';
import { articleOg, robots, sitemap } from '../controllers/seo.controller.js';

/**
 * Phase 10 — SEO, Sitemap & Open Graph
 *
 * Mounted at /public from routes/index.ts. All routes are public.
 */
const router = Router();

router.get('/sitemap.xml', asyncHandler(sitemap));
router.get('/robots.txt', asyncHandler(robots));
router.get(
  '/articles/:slug/og',
  validate({ params: publicSlugParamSchema }),
  asyncHandler(articleOg),
);

export default router;

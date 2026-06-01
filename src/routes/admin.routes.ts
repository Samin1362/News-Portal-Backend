import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { analyticsQuerySchema } from '../validators/analytics.validator.js';
import { getAnalytics, getRevenue } from '../controllers/insights.controller.js';

/**
 * Admin-only aggregation surfaces. Mounted at /admin (after /admin/comments,
 * so the editor-accessible comment routes win their more specific prefix).
 * Every route here is admin-gated at the router level.
 */
const router = Router();

router.use(asyncHandler(authenticate));
router.use(requireRole('admin'));

router.get(
  '/analytics',
  validate({ query: analyticsQuerySchema }),
  asyncHandler(getAnalytics),
);

router.get('/revenue', asyncHandler(getRevenue));

export default router;

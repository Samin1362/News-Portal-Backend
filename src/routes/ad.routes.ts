import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { objectIdParamSchema } from '../validators/common.validator.js';
import {
  createAdBodySchema,
  listAdsQuerySchema,
  publicAdsQuerySchema,
  updateAdBodySchema,
} from '../validators/ad.validator.js';
import {
  clickAd,
  createAd,
  deleteAd,
  getAdById,
  listAds,
  listPublicAds,
  updateAd,
} from '../controllers/ad.controller.js';

/**
 * Phase 9 — Advertisements
 *
 * Two route surfaces exported from this single file:
 *   - adminAdRouter   (mounted at /ads)         admin-only CRUD
 *   - publicAdRouter  (mounted at /public/ads)  placement-filtered reads + click tracking
 */

// =====================================================================
// Admin routes ( /ads )
// =====================================================================
export const adminAdRouter = Router();

adminAdRouter.use(asyncHandler(authenticate));
adminAdRouter.use(requireRole('admin'));

adminAdRouter.post(
  '/',
  validate({ body: createAdBodySchema }),
  asyncHandler(createAd),
);

adminAdRouter.get(
  '/',
  validate({ query: listAdsQuerySchema }),
  asyncHandler(listAds),
);

adminAdRouter.get(
  '/:id',
  validate({ params: objectIdParamSchema }),
  asyncHandler(getAdById),
);

adminAdRouter.patch(
  '/:id',
  validate({ params: objectIdParamSchema, body: updateAdBodySchema }),
  asyncHandler(updateAd),
);

adminAdRouter.delete(
  '/:id',
  validate({ params: objectIdParamSchema }),
  asyncHandler(deleteAd),
);

// =====================================================================
// Public routes ( /public/ads )
// =====================================================================
export const publicAdRouter = Router();

publicAdRouter.get(
  '/',
  validate({ query: publicAdsQuerySchema }),
  asyncHandler(listPublicAds),
);

publicAdRouter.post(
  '/:id/click',
  validate({ params: objectIdParamSchema }),
  asyncHandler(clickAd),
);

export default adminAdRouter;

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import { rejectIfBlocked } from '../middlewares/blockCheck.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { objectIdParamSchema } from '../validators/common.validator.js';
import {
  listMediaQuerySchema,
  registerMediaBodySchema,
  registerMediaBulkBodySchema,
  updateMediaBodySchema,
} from '../validators/media.validator.js';
import {
  getById,
  listMine,
  register,
  registerBulk,
  remove,
  update,
} from '../controllers/media.controller.js';

const router = Router();

router.use(asyncHandler(authenticate));

// Static-segment routes — declared BEFORE /:id
router.post(
  '/',
  rejectIfBlocked,
  requireRole('journalist', 'editor', 'admin'),
  validate({ body: registerMediaBodySchema }),
  asyncHandler(register),
);

router.post(
  '/bulk',
  rejectIfBlocked,
  requireRole('journalist', 'editor', 'admin'),
  validate({ body: registerMediaBulkBodySchema }),
  asyncHandler(registerBulk),
);

router.get(
  '/me',
  requireRole('journalist', 'editor', 'admin'),
  validate({ query: listMediaQuerySchema }),
  asyncHandler(listMine),
);

// Generic /:id (last)
router.get(
  '/:id',
  requireRole('journalist', 'editor', 'admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(getById),
);

router.patch(
  '/:id',
  rejectIfBlocked,
  requireRole('journalist', 'editor', 'admin'),
  validate({ params: objectIdParamSchema, body: updateMediaBodySchema }),
  asyncHandler(update),
);

router.delete(
  '/:id',
  rejectIfBlocked,
  requireRole('journalist', 'editor', 'admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(remove),
);

export default router;

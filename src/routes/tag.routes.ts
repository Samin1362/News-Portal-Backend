import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { objectIdParamSchema } from '../validators/common.validator.js';
import { createTagBodySchema, listTagsQuerySchema } from '../validators/tag.validator.js';
import { createTag, deleteTag, listTags } from '../controllers/tag.controller.js';

const router = Router();

// Public read with optional ?q= search
router.get(
  '/',
  validate({ query: listTagsQuerySchema }),
  asyncHandler(listTags),
);

// Admin or editor can create
router.post(
  '/',
  asyncHandler(authenticate),
  requireRole('admin', 'editor'),
  validate({ body: createTagBodySchema }),
  asyncHandler(createTag),
);

// Only admin can delete
router.delete(
  '/:id',
  asyncHandler(authenticate),
  requireRole('admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(deleteTag),
);

export default router;

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { objectIdParamSchema } from '../validators/common.validator.js';
import {
  createCategoryBodySchema,
  listCategoriesQuerySchema,
  slugParamSchema,
  updateCategoryBodySchema,
} from '../validators/category.validator.js';
import {
  createCategory,
  deleteCategory,
  getCategoryBySlug,
  listCategories,
  updateCategory,
} from '../controllers/category.controller.js';

const router = Router();

// Public reads
router.get(
  '/',
  validate({ query: listCategoriesQuerySchema }),
  asyncHandler(listCategories),
);

router.get(
  '/:slug',
  validate({ params: slugParamSchema }),
  asyncHandler(getCategoryBySlug),
);

// Admin writes
router.post(
  '/',
  asyncHandler(authenticate),
  requireRole('admin'),
  validate({ body: createCategoryBodySchema }),
  asyncHandler(createCategory),
);

router.patch(
  '/:id',
  asyncHandler(authenticate),
  requireRole('admin'),
  validate({ params: objectIdParamSchema, body: updateCategoryBodySchema }),
  asyncHandler(updateCategory),
);

router.delete(
  '/:id',
  asyncHandler(authenticate),
  requireRole('admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(deleteCategory),
);

export default router;

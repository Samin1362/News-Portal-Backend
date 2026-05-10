import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import { rejectIfBlocked } from '../middlewares/blockCheck.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { objectIdParamSchema } from '../validators/common.validator.js';
import {
  createArticleBodySchema,
  flagsBodySchema,
  listMineQuerySchema,
  queueQuerySchema,
  rejectBodySchema,
  scheduleBodySchema,
  updateArticleBodySchema,
} from '../validators/article.validator.js';
import {
  createDraft,
  getById,
  listMine,
  remove,
  update,
} from '../controllers/article.controller.js';
import {
  approve,
  archive,
  listQueue,
  publish,
  reject,
  schedule,
  setFlags,
  startReview,
  submit,
  unarchive,
} from '../controllers/articleWorkflow.controller.js';

const router = Router();

// All routes require authentication.
router.use(asyncHandler(authenticate));

// ---- Static-segment routes (must be defined BEFORE /:id) ----

router.post(
  '/',
  rejectIfBlocked,
  requireRole('journalist', 'editor', 'admin'),
  validate({ body: createArticleBodySchema }),
  asyncHandler(createDraft),
);

router.get(
  '/me',
  requireRole('journalist', 'editor', 'admin'),
  validate({ query: listMineQuerySchema }),
  asyncHandler(listMine),
);

router.get(
  '/queue',
  requireRole('editor', 'admin'),
  validate({ query: queueQuerySchema }),
  asyncHandler(listQueue),
);

// ---- Workflow transitions (specific path → must come BEFORE generic /:id) ----

router.post(
  '/:id/submit',
  rejectIfBlocked,
  requireRole('journalist', 'editor', 'admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(submit),
);

router.post(
  '/:id/start-review',
  rejectIfBlocked,
  requireRole('editor', 'admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(startReview),
);

router.post(
  '/:id/approve',
  rejectIfBlocked,
  requireRole('editor', 'admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(approve),
);

router.post(
  '/:id/reject',
  rejectIfBlocked,
  requireRole('editor', 'admin'),
  validate({ params: objectIdParamSchema, body: rejectBodySchema }),
  asyncHandler(reject),
);

router.post(
  '/:id/publish',
  rejectIfBlocked,
  requireRole('editor', 'admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(publish),
);

router.post(
  '/:id/schedule',
  rejectIfBlocked,
  requireRole('editor', 'admin'),
  validate({ params: objectIdParamSchema, body: scheduleBodySchema }),
  asyncHandler(schedule),
);

router.post(
  '/:id/archive',
  rejectIfBlocked,
  requireRole('editor', 'admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(archive),
);

router.post(
  '/:id/unarchive',
  rejectIfBlocked,
  requireRole('editor', 'admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(unarchive),
);

router.patch(
  '/:id/flags',
  rejectIfBlocked,
  requireRole('editor', 'admin'),
  validate({ params: objectIdParamSchema, body: flagsBodySchema }),
  asyncHandler(setFlags),
);

// ---- Generic /:id (last) ----

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
  validate({ params: objectIdParamSchema, body: updateArticleBodySchema }),
  asyncHandler(update),
);

router.delete(
  '/:id',
  rejectIfBlocked,
  requireRole('journalist', 'admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(remove),
);

export default router;

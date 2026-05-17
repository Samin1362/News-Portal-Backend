import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import { rejectIfBlocked } from '../middlewares/blockCheck.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { objectIdParamSchema } from '../validators/common.validator.js';
import {
  changeRoleBodySchema,
  listUsersQuerySchema,
  setBlockedBodySchema,
  setCommentBlockedBodySchema,
  updateMeBodySchema,
} from '../validators/user.validator.js';
import {
  changeRole,
  getUserById,
  listUsers,
  removeUser,
  setBlocked,
  setCommentBlocked,
  updateMe,
} from '../controllers/user.controller.js';

const router = Router();

// Self-service — any authenticated user
router.patch(
  '/me',
  asyncHandler(authenticate),
  rejectIfBlocked,
  validate({ body: updateMeBodySchema }),
  asyncHandler(updateMe),
);

// Directory reads — editors need this for the reporters desk + author lookups.
// Write-side operations below remain admin-only.
router.get(
  '/',
  asyncHandler(authenticate),
  requireRole('editor', 'admin'),
  validate({ query: listUsersQuerySchema }),
  asyncHandler(listUsers),
);

router.get(
  '/:id',
  asyncHandler(authenticate),
  requireRole('editor', 'admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(getUserById),
);

router.patch(
  '/:id/role',
  asyncHandler(authenticate),
  requireRole('admin'),
  validate({ params: objectIdParamSchema, body: changeRoleBodySchema }),
  asyncHandler(changeRole),
);

router.patch(
  '/:id/block',
  asyncHandler(authenticate),
  requireRole('admin'),
  validate({ params: objectIdParamSchema, body: setBlockedBodySchema }),
  asyncHandler(setBlocked),
);

router.patch(
  '/:id/comment-block',
  asyncHandler(authenticate),
  requireRole('admin'),
  validate({ params: objectIdParamSchema, body: setCommentBlockedBodySchema }),
  asyncHandler(setCommentBlocked),
);

router.delete(
  '/:id',
  asyncHandler(authenticate),
  requireRole('admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(removeUser),
);

export default router;

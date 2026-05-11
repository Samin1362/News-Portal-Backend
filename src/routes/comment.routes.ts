import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import { rejectIfBlocked } from '../middlewares/blockCheck.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { objectIdParamSchema } from '../validators/common.validator.js';
import {
  articleCommentsEnabledBodySchema,
  createCommentBodySchema,
  listAdminCommentsQuerySchema,
  listCommentsQuerySchema,
  reportCommentBodySchema,
} from '../validators/comment.validator.js';
import {
  adminHardDelete,
  approve,
  createCommentOnArticle,
  createReply,
  deleteOwn,
  listAdminComments,
  listCommentsForArticle,
  listReplies,
  reject,
  reportComment,
  setArticleCommentsEnabled,
  toggleLike,
} from '../controllers/comment.controller.js';

/**
 * Phase 8 — Comments
 *
 * Three route surfaces, exported from one file:
 *   - articleCommentRouter   (mounted at /articles)        public + reader+ + editor/admin
 *   - commentRouter          (mounted at /comments)        reader+ for writes; public for reply list
 *   - adminCommentRouter     (mounted at /admin/comments)  editor/admin
 */

// =====================================================================
// Article-prefix routes ( /articles/:id/comments , /articles/:id/comments-enabled )
// Mounted BEFORE the main /articles router so they short-circuit before it
// applies its router-level `authenticate` middleware.
// =====================================================================
export const articleCommentRouter = Router();

articleCommentRouter.get(
  '/:id/comments',
  asyncHandler(optionalAuth),
  validate({ params: objectIdParamSchema, query: listCommentsQuerySchema }),
  asyncHandler(listCommentsForArticle),
);

articleCommentRouter.post(
  '/:id/comments',
  asyncHandler(authenticate),
  rejectIfBlocked,
  validate({ params: objectIdParamSchema, body: createCommentBodySchema }),
  asyncHandler(createCommentOnArticle),
);

articleCommentRouter.patch(
  '/:id/comments-enabled',
  asyncHandler(authenticate),
  requireRole('editor', 'admin'),
  validate({ params: objectIdParamSchema, body: articleCommentsEnabledBodySchema }),
  asyncHandler(setArticleCommentsEnabled),
);

// =====================================================================
// Comment-prefix routes ( /comments/:id , /comments/:id/replies, etc. )
// =====================================================================
export const commentRouter = Router();

// Reads
commentRouter.get(
  '/:id/replies',
  asyncHandler(optionalAuth),
  validate({ params: objectIdParamSchema, query: listCommentsQuerySchema }),
  asyncHandler(listReplies),
);

// Writes — reader+
commentRouter.post(
  '/:id/replies',
  asyncHandler(authenticate),
  rejectIfBlocked,
  validate({ params: objectIdParamSchema, body: createCommentBodySchema }),
  asyncHandler(createReply),
);

commentRouter.post(
  '/:id/like',
  asyncHandler(authenticate),
  rejectIfBlocked,
  validate({ params: objectIdParamSchema }),
  asyncHandler(toggleLike),
);

commentRouter.post(
  '/:id/report',
  asyncHandler(authenticate),
  validate({ params: objectIdParamSchema, body: reportCommentBodySchema }),
  asyncHandler(reportComment),
);

commentRouter.delete(
  '/:id',
  asyncHandler(authenticate),
  validate({ params: objectIdParamSchema }),
  asyncHandler(deleteOwn),
);

// Moderation actions on individual comments
commentRouter.patch(
  '/:id/approve',
  asyncHandler(authenticate),
  requireRole('editor', 'admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(approve),
);

commentRouter.patch(
  '/:id/reject',
  asyncHandler(authenticate),
  requireRole('editor', 'admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(reject),
);

// =====================================================================
// Admin-prefix routes ( /admin/comments )
// =====================================================================
export const adminCommentRouter = Router();

adminCommentRouter.get(
  '/',
  asyncHandler(authenticate),
  requireRole('editor', 'admin'),
  validate({ query: listAdminCommentsQuerySchema }),
  asyncHandler(listAdminComments),
);

adminCommentRouter.delete(
  '/:id',
  asyncHandler(authenticate),
  requireRole('admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(adminHardDelete),
);

export default commentRouter;

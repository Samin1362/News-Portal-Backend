import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import { rejectIfBlocked } from '../middlewares/blockCheck.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { objectIdParamSchema } from '../validators/common.validator.js';
import {
  createRoleRequestBodySchema,
  listRoleRequestsQuerySchema,
  rejectRoleRequestBodySchema,
} from '../validators/roleRequest.validator.js';
import {
  approveOne,
  cancelOne,
  createMyRequest,
  getMyLatest,
  getOne,
  listForAdmin,
  rejectOne,
} from '../controllers/roleRequest.controller.js';

const router = Router();

// Self-service: any authenticated, unblocked user.
router.post(
  '/',
  asyncHandler(authenticate),
  rejectIfBlocked,
  validate({ body: createRoleRequestBodySchema }),
  asyncHandler(createMyRequest),
);

router.get(
  '/me',
  asyncHandler(authenticate),
  asyncHandler(getMyLatest),
);

router.patch(
  '/:id/cancel',
  asyncHandler(authenticate),
  rejectIfBlocked,
  validate({ params: objectIdParamSchema }),
  asyncHandler(cancelOne),
);

// Admin only — list + detail + approve/reject.
router.get(
  '/',
  asyncHandler(authenticate),
  requireRole('admin'),
  validate({ query: listRoleRequestsQuerySchema }),
  asyncHandler(listForAdmin),
);

router.get(
  '/:id',
  asyncHandler(authenticate),
  requireRole('admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(getOne),
);

router.patch(
  '/:id/approve',
  asyncHandler(authenticate),
  requireRole('admin'),
  validate({ params: objectIdParamSchema }),
  asyncHandler(approveOne),
);

router.patch(
  '/:id/reject',
  asyncHandler(authenticate),
  requireRole('admin'),
  validate({ params: objectIdParamSchema, body: rejectRoleRequestBodySchema }),
  asyncHandler(rejectOne),
);

export default router;

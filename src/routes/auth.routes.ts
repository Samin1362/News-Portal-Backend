import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, verifyFirebase } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { syncBodySchema } from '../validators/auth.validator.js';
import { getMe, syncMe } from '../controllers/auth.controller.js';

const router = Router();

router.post(
  '/sync',
  asyncHandler(verifyFirebase),
  validate({ body: syncBodySchema }),
  asyncHandler(syncMe),
);

router.get('/me', asyncHandler(authenticate), asyncHandler(getMe));

export default router;

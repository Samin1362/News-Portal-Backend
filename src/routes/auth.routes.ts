import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, verifyFirebase } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authRateLimiter } from '../middlewares/rateLimit.middleware.js';
import {
  otpSendBodySchema,
  otpVerifyBodySchema,
  syncBodySchema,
} from '../validators/auth.validator.js';
import {
  getMe,
  sendEmailOtp,
  syncMe,
  verifyEmailOtp,
} from '../controllers/auth.controller.js';

const router = Router();

// Phase 12 — auth-sensitive endpoints capped at 30/min/IP.
router.use(authRateLimiter);

router.post(
  '/sync',
  asyncHandler(verifyFirebase),
  validate({ body: syncBodySchema }),
  asyncHandler(syncMe),
);

router.get('/me', asyncHandler(authenticate), asyncHandler(getMe));

// §0a — OTP endpoints. Public (rate-limited at the service layer too).
router.post(
  '/email-otp/send',
  validate({ body: otpSendBodySchema }),
  asyncHandler(sendEmailOtp),
);

router.post(
  '/email-otp/verify',
  validate({ body: otpVerifyBodySchema }),
  asyncHandler(verifyEmailOtp),
);

export default router;

import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import * as userService from '../services/user.service.js';
import * as emailOtpService from '../services/emailOtp.service.js';
import { AppError } from '../utils/AppError.js';
import { ok } from '../views/apiResponse.js';
import { toUserDTO } from '../views/user.view.js';
import type {
  OtpSendBody,
  OtpVerifyBody,
} from '../validators/auth.validator.js';

function requireValidated<T>(req: Request, key: 'body' | 'params' | 'query'): T {
  const value = req.validated?.[key];
  if (value === undefined) throw AppError.badRequest(`Missing validated ${key}`);
  return value as T;
}

export async function syncMe(req: Request, res: Response): Promise<void> {
  if (!req.firebaseUser) {
    throw AppError.unauthorized('Firebase token required');
  }
  const user = await authService.syncUser(req.firebaseUser);
  ok(res, toUserDTO(user), 'Synced');
}

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw AppError.unauthorized('Authentication required');
  }
  const user = await userService.getById(req.user.id);
  ok(res, toUserDTO(user));
}

export async function sendEmailOtp(req: Request, res: Response): Promise<void> {
  const body = requireValidated<OtpSendBody>(req, 'body');
  const result = await emailOtpService.sendOtp({
    email: body.email,
    purpose: body.purpose,
    ipAddress: req.ip ?? 'unknown',
    userAgent: req.headers['user-agent'] ?? 'unknown',
  });
  ok(
    res,
    { expiresAt: result.expiresAt.toISOString() },
    'Verification code sent',
  );
}

export async function verifyEmailOtp(
  req: Request,
  res: Response,
): Promise<void> {
  const body = requireValidated<OtpVerifyBody>(req, 'body');
  const result = await emailOtpService.verifyOtp({
    email: body.email,
    code: body.code,
    purpose: body.purpose,
  });
  ok(
    res,
    {
      verificationToken: result.verificationToken,
      expiresAt: result.expiresAt.toISOString(),
    },
    'Email verified',
  );
}

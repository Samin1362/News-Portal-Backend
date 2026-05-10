import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import * as userService from '../services/user.service.js';
import { AppError } from '../utils/AppError.js';
import { ok } from '../views/apiResponse.js';
import { toUserDTO } from '../views/user.view.js';

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

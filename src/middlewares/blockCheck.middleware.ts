import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';

export function rejectIfBlocked(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.isBlocked) {
    next(AppError.forbidden('Account is blocked'));
    return;
  }
  next();
}

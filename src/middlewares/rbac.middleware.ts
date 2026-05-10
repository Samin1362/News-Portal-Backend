import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import type { Role } from '../config/constants.js';

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized('Authentication required'));
      return;
    }
    if (!allowed.includes(req.user.role)) {
      next(AppError.forbidden(`Requires role: ${allowed.join(' or ')}`));
      return;
    }
    next();
  };
}

export function requireAnyRole(allowed: Role[]) {
  return requireRole(...allowed);
}

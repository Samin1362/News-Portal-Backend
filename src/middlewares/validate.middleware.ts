import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError.js';

export interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const validated: { body?: unknown; params?: unknown; query?: unknown } = {};

      if (schemas.body) {
        validated.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        validated.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        validated.query = schemas.query.parse(req.query);
      }

      req.validated = validated;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        next(AppError.badRequest('Validation failed', details));
        return;
      }
      next(err);
    }
  };
}

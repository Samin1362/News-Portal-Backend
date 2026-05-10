import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import type { ApiErrorResponse } from '../types/api.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  if (statusCode >= 500) {
    logger.error({ err, statusCode, code }, 'Unhandled error');
  } else {
    logger.warn({ statusCode, code, message }, 'Request error');
  }

  const body: ApiErrorResponse = {
    success: false,
    message,
    code,
    ...(details !== undefined ? { details } : {}),
  };

  if (env.NODE_ENV !== 'production' && err instanceof Error && statusCode >= 500) {
    (body as ApiErrorResponse & { stack?: string }).stack = err.stack;
  }

  res.status(statusCode).json(body);
}

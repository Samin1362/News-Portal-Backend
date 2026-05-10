import type { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>,
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction,
) => Promise<unknown> | unknown;

export function asyncHandler<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>,
>(handler: AsyncRouteHandler<P, ResBody, ReqBody, ReqQuery>) {
  return (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

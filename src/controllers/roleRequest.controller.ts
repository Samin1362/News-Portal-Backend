import type { Request, Response } from 'express';
import * as roleRequestService from '../services/roleRequest.service.js';
import { AppError } from '../utils/AppError.js';
import { created, ok, paginated } from '../views/apiResponse.js';
import {
  toRoleRequestDTO,
  toRoleRequestListDTO,
} from '../views/roleRequest.view.js';
import { buildMeta } from '../utils/pagination.js';
import type {
  CreateRoleRequestBody,
  ListRoleRequestsQuery,
  RejectRoleRequestBody,
} from '../validators/roleRequest.validator.js';
import type { ObjectIdParam } from '../validators/common.validator.js';

function requireValidated<T>(req: Request, key: 'body' | 'params' | 'query'): T {
  const value = req.validated?.[key];
  if (value === undefined) throw AppError.badRequest(`Missing validated ${key}`);
  return value as T;
}

export async function createMyRequest(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) throw AppError.unauthorized('Authentication required');
  const body = requireValidated<CreateRoleRequestBody>(req, 'body');
  const doc = await roleRequestService.submitForUser({
    userId: req.user.id,
    body,
  });
  created(res, toRoleRequestDTO(doc), 'Request submitted');
}

export async function listForAdmin(
  req: Request,
  res: Response,
): Promise<void> {
  const query = requireValidated<ListRoleRequestsQuery>(req, 'query');
  const result = await roleRequestService.listForAdmin(query);
  paginated(
    res,
    toRoleRequestListDTO(result.items),
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function getMyLatest(req: Request, res: Response): Promise<void> {
  if (!req.user) throw AppError.unauthorized('Authentication required');
  const doc = await roleRequestService.getLatestForUser(req.user.id);
  ok(res, doc ? toRoleRequestDTO(doc) : null);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const params = requireValidated<ObjectIdParam>(req, 'params');
  const doc = await roleRequestService.getById(params.id);
  ok(res, toRoleRequestDTO(doc));
}

export async function approveOne(req: Request, res: Response): Promise<void> {
  if (!req.user) throw AppError.unauthorized('Authentication required');
  const params = requireValidated<ObjectIdParam>(req, 'params');
  const doc = await roleRequestService.approveRequest({
    id: params.id,
    decidedBy: req.user.id,
  });
  ok(res, toRoleRequestDTO(doc), 'Request approved · email queued');
}

export async function rejectOne(req: Request, res: Response): Promise<void> {
  if (!req.user) throw AppError.unauthorized('Authentication required');
  const params = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<RejectRoleRequestBody>(req, 'body');
  const doc = await roleRequestService.rejectRequest({
    id: params.id,
    decidedBy: req.user.id,
    reason: body.reason,
  });
  ok(res, toRoleRequestDTO(doc), 'Request rejected · email queued');
}

export async function cancelOne(req: Request, res: Response): Promise<void> {
  if (!req.user) throw AppError.unauthorized('Authentication required');
  const params = requireValidated<ObjectIdParam>(req, 'params');
  const doc = await roleRequestService.cancelOwnRequest({
    id: params.id,
    userId: req.user.id,
  });
  ok(res, toRoleRequestDTO(doc), 'Request cancelled');
}

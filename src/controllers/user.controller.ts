import type { Request, Response } from 'express';
import * as userService from '../services/user.service.js';
import { AppError } from '../utils/AppError.js';
import { ok, noContent, paginated } from '../views/apiResponse.js';
import { toUserDTO, toUserListDTO } from '../views/user.view.js';
import { buildMeta } from '../utils/pagination.js';
import type {
  ChangeRoleBody,
  ListUsersQuery,
  SetBlockedBody,
  SetCommentBlockedBody,
  UpdateMeBody,
} from '../validators/user.validator.js';
import type { ObjectIdParam } from '../validators/common.validator.js';

function requireValidated<T>(req: Request, key: 'body' | 'params' | 'query'): T {
  const value = req.validated?.[key];
  if (value === undefined) {
    throw AppError.badRequest(`Missing validated ${key}`);
  }
  return value as T;
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw AppError.unauthorized('Authentication required');
  const body = requireValidated<UpdateMeBody>(req, 'body');
  const updated = await userService.updateProfile(req.user.id, body);
  ok(res, toUserDTO(updated), 'Profile updated');
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = requireValidated<ListUsersQuery>(req, 'query');
  const result = await userService.listUsers(query);
  paginated(
    res,
    toUserListDTO(result.items),
    buildMeta(result.page, result.limit, result.total),
  );
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const params = requireValidated<ObjectIdParam>(req, 'params');
  const user = await userService.getById(params.id);
  ok(res, toUserDTO(user));
}

export async function changeRole(req: Request, res: Response): Promise<void> {
  const params = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<ChangeRoleBody>(req, 'body');
  const updated = await userService.changeRole(params.id, body);
  ok(res, toUserDTO(updated), 'Role updated');
}

export async function setBlocked(req: Request, res: Response): Promise<void> {
  const params = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<SetBlockedBody>(req, 'body');
  const updated = await userService.setBlocked(params.id, body);
  ok(res, toUserDTO(updated), body.isBlocked ? 'User blocked' : 'User unblocked');
}

export async function setCommentBlocked(req: Request, res: Response): Promise<void> {
  const params = requireValidated<ObjectIdParam>(req, 'params');
  const body = requireValidated<SetCommentBlockedBody>(req, 'body');
  const updated = await userService.setCommentBlocked(params.id, body);
  ok(
    res,
    toUserDTO(updated),
    body.isCommentBlocked ? 'Comment access blocked' : 'Comment access restored',
  );
}

export async function removeUser(req: Request, res: Response): Promise<void> {
  const params = requireValidated<ObjectIdParam>(req, 'params');
  await userService.softDelete(params.id);
  noContent(res);
}

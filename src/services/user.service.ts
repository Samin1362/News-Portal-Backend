import type { ObjectId, WithId } from 'mongodb';
import {
  findById,
  listUsers as listUsersModel,
  softDelete as softDeleteModel,
  updateUser,
  type UpdateUserPatch,
  type UserDoc,
} from '../models/user.model.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination } from '../utils/pagination.js';
import type { Role } from '../config/constants.js';
import type {
  ChangeRoleBody,
  ListUsersQuery,
  SetBlockedBody,
  SetCommentBlockedBody,
  UpdateMeBody,
} from '../validators/user.validator.js';
import {
  sendAccountRestoredEmail,
  sendAccountSuspendedEmail,
  sendRoleChangedEmail,
} from './email.service.js';

export async function getById(id: ObjectId | string): Promise<WithId<UserDoc>> {
  const user = await findById(id);
  if (!user) throw AppError.notFound('User not found');
  return user;
}

export async function updateProfile(
  id: ObjectId | string,
  body: UpdateMeBody,
): Promise<WithId<UserDoc>> {
  const patch: UpdateUserPatch = {};
  if (body.displayName !== undefined) patch.displayName = body.displayName;
  if (body.bio !== undefined) patch.bio = body.bio;
  if (body.photoURL !== undefined) patch.photoURL = body.photoURL || null;

  const updated = await updateUser(id, patch);
  if (!updated) throw AppError.notFound('User not found');
  return updated;
}

export async function listUsers(query: ListUsersQuery): Promise<{
  items: WithId<UserDoc>[];
  page: number;
  limit: number;
  total: number;
}> {
  const { page, limit, skip } = parsePagination(query);
  const result = await listUsersModel({
    role: query.role,
    q: query.q,
    page,
    limit,
    skip,
  });
  return { items: result.items, page, limit, total: result.total };
}

export async function changeRole(
  id: ObjectId | string,
  body: ChangeRoleBody,
  actor?: { id: string; displayName: string },
): Promise<WithId<UserDoc>> {
  const before = await findById(id);
  if (!before) throw AppError.notFound('User not found');
  const updated = await setField(id, { role: body.role });
  if (before.role !== body.role) {
    void sendRoleChangedEmail({
      to: updated.email,
      displayName: updated.displayName,
      fromRole: before.role,
      toRole: body.role,
      changedBy: actor?.displayName ?? 'an administrator',
      relatedUserId: updated._id,
    });
  }
  return updated;
}

export async function setBlocked(
  id: ObjectId | string,
  body: SetBlockedBody,
): Promise<WithId<UserDoc>> {
  const before = await findById(id);
  if (!before) throw AppError.notFound('User not found');
  const updated = await setField(id, { isBlocked: body.isBlocked });
  if (before.isBlocked !== body.isBlocked) {
    if (body.isBlocked) {
      void sendAccountSuspendedEmail({
        to: updated.email,
        displayName: updated.displayName,
        relatedUserId: updated._id,
      });
    } else {
      void sendAccountRestoredEmail({
        to: updated.email,
        displayName: updated.displayName,
        relatedUserId: updated._id,
      });
    }
  }
  return updated;
}

export async function setCommentBlocked(
  id: ObjectId | string,
  body: SetCommentBlockedBody,
): Promise<WithId<UserDoc>> {
  return setField(id, { isCommentBlocked: body.isCommentBlocked });
}

export async function softDelete(id: ObjectId | string): Promise<void> {
  const ok = await softDeleteModel(id);
  if (!ok) throw AppError.notFound('User not found');
}

async function setField(
  id: ObjectId | string,
  patch: { role?: Role; isBlocked?: boolean; isCommentBlocked?: boolean },
): Promise<WithId<UserDoc>> {
  const updated = await updateUser(id, patch);
  if (!updated) throw AppError.notFound('User not found');
  return updated;
}

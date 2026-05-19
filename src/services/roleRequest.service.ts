import { ObjectId, type WithId } from 'mongodb';
import { AppError } from '../utils/AppError.js';
import { parsePagination } from '../utils/pagination.js';
import { env } from '../config/env.js';
import {
  createRoleRequest,
  findById,
  findLatestForUser,
  findOpenForUser,
  listRecentDecidedForUser,
  listRoleRequests,
  transitionStatus,
  type RoleRequestDoc,
} from '../models/roleRequest.model.js';
import { findById as findUserById, updateUser } from '../models/user.model.js';
import { consumeToken } from './emailOtp.service.js';
import {
  sendRoleApprovedEmail,
  sendRoleRejectedEmail,
} from './email.service.js';
import type {
  CreateRoleRequestBody,
  ListRoleRequestsQuery,
} from '../validators/roleRequest.validator.js';

const REAPPLY_COOLDOWN_DAYS = 30;

export async function submitForUser(args: {
  userId: ObjectId | string;
  body: CreateRoleRequestBody;
}): Promise<WithId<RoleRequestDoc>> {
  const userId =
    typeof args.userId === 'string' ? new ObjectId(args.userId) : args.userId;

  const user = await findUserById(userId);
  if (!user) throw AppError.notFound('User not found');
  if (user.role !== 'reader' && user.role !== 'journalist') {
    throw AppError.badRequest(
      'Only readers and journalists can request role upgrades.',
    );
  }

  const existing = await findOpenForUser(userId);
  if (existing) {
    throw AppError.conflict('You already have a pending request.', {
      requestId: existing._id.toString(),
    });
  }

  // 30-day cooldown after rejection.
  const recent = await listRecentDecidedForUser(userId, REAPPLY_COOLDOWN_DAYS);
  const lastReject = recent
    .filter((r) => r.status === 'rejected')
    .sort(
      (a, b) =>
        (b.decidedAt?.getTime() ?? 0) - (a.decidedAt?.getTime() ?? 0),
    )[0];
  if (lastReject) {
    const earliestRetry = new Date(
      (lastReject.decidedAt as Date).getTime() +
        REAPPLY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
    );
    throw AppError.unprocessable(
      `You can reapply on ${earliestRetry.toISOString().slice(0, 10)}.`,
      { code: 'REAPPLY_COOLDOWN', earliestRetry: earliestRetry.toISOString() },
    );
  }

  await consumeToken({
    token: args.body.verificationToken,
    expectedEmail: user.email,
  });

  return createRoleRequest({
    userId,
    fromRole: user.role,
    toRole: args.body.toRole,
    status: 'pending',
    submittedInfo: {
      ...args.body.submittedInfo,
      agreedToGuidelinesAt: new Date(),
      guidelinesVersion: env.JOURNALIST_GUIDELINES_VERSION,
    },
    emailVerifiedAt: new Date(),
  });
}

export async function listForAdmin(
  query: ListRoleRequestsQuery,
): Promise<{
  items: WithId<RoleRequestDoc>[];
  page: number;
  limit: number;
  total: number;
}> {
  const { page, limit, skip } = parsePagination(query);
  const result = await listRoleRequests({
    status: query.status,
    page,
    limit,
    skip,
  });
  return { items: result.items, page, limit, total: result.total };
}

export async function getById(
  id: ObjectId | string,
): Promise<WithId<RoleRequestDoc>> {
  const doc = await findById(id);
  if (!doc) throw AppError.notFound('Role request not found');
  return doc;
}

export async function getLatestForUser(
  userId: ObjectId | string,
): Promise<WithId<RoleRequestDoc> | null> {
  const _id = typeof userId === 'string' ? new ObjectId(userId) : userId;
  return findLatestForUser(_id);
}

export async function approveRequest(args: {
  id: ObjectId | string;
  decidedBy: ObjectId | string;
}): Promise<WithId<RoleRequestDoc>> {
  const current = await getById(args.id);
  if (current.status !== 'pending') {
    throw AppError.conflict(
      `Cannot approve a request in status "${current.status}".`,
    );
  }
  const decidedBy =
    typeof args.decidedBy === 'string'
      ? new ObjectId(args.decidedBy)
      : args.decidedBy;

  const updatedUser = await updateUser(current.userId, { role: current.toRole });
  if (!updatedUser) {
    throw AppError.notFound('Requester no longer exists.');
  }

  const transitioned = await transitionStatus(args.id, 'approved', decidedBy, null);
  if (!transitioned) {
    throw AppError.conflict(
      'Role request changed status before approval could complete.',
    );
  }

  // Fire-and-forget the email — failures land in email_log.
  void sendRoleApprovedEmail({
    to: updatedUser.email,
    displayName: updatedUser.displayName,
    toRole: current.toRole,
    relatedUserId: updatedUser._id,
    relatedRoleRequestId: transitioned._id,
  });

  return transitioned;
}

export async function rejectRequest(args: {
  id: ObjectId | string;
  decidedBy: ObjectId | string;
  reason: string;
}): Promise<WithId<RoleRequestDoc>> {
  const current = await getById(args.id);
  if (current.status !== 'pending') {
    throw AppError.conflict(
      `Cannot reject a request in status "${current.status}".`,
    );
  }
  const decidedBy =
    typeof args.decidedBy === 'string'
      ? new ObjectId(args.decidedBy)
      : args.decidedBy;

  const transitioned = await transitionStatus(
    args.id,
    'rejected',
    decidedBy,
    args.reason,
  );
  if (!transitioned) {
    throw AppError.conflict(
      'Role request changed status before rejection could complete.',
    );
  }

  const user = await findUserById(current.userId);
  if (user) {
    void sendRoleRejectedEmail({
      to: user.email,
      displayName: user.displayName,
      toRole: current.toRole,
      reason: args.reason,
      relatedUserId: user._id,
      relatedRoleRequestId: transitioned._id,
    });
  }

  return transitioned;
}

export async function cancelOwnRequest(args: {
  id: ObjectId | string;
  userId: ObjectId | string;
}): Promise<WithId<RoleRequestDoc>> {
  const current = await getById(args.id);
  const ownerId =
    typeof args.userId === 'string'
      ? new ObjectId(args.userId)
      : args.userId;
  if (!current.userId.equals(ownerId)) {
    throw AppError.forbidden('You can only cancel your own request.');
  }
  if (current.status !== 'pending') {
    throw AppError.conflict('Only pending requests can be cancelled.');
  }
  const cancelled = await transitionStatus(args.id, 'cancelled', ownerId, null);
  if (!cancelled) {
    throw AppError.conflict('Request changed status before cancellation.');
  }
  return cancelled;
}

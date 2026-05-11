import { ObjectId, type WithId } from 'mongodb';
import type { CommentDoc } from '../models/comment.model.js';
import type { UserDoc } from '../models/user.model.js';
import type { CommentStatus } from '../config/constants.js';

export interface CommentAuthorDTO {
  id: string;
  displayName: string;
  photoURL: string | null;
}

export interface CommentDTO {
  id: string;
  articleId: string;
  parentId: string | null;
  content: string;
  author: CommentAuthorDTO | null;
  likeCount: number;
  hasLiked: boolean;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CommentWithRepliesDTO extends CommentDTO {
  replies: CommentDTO[];
  totalReplies: number;
}

export interface ModerationCommentDTO extends CommentDTO {
  reportCount: number;
  reports: Array<{ userId: string; reason: string; at: string }>;
}

export type UserMap = Map<string, WithId<UserDoc>>;

function authorFor(comment: WithId<CommentDoc>, users: UserMap): CommentAuthorDTO | null {
  const user = users.get(comment.userId.toString());
  if (!user) return null;
  return {
    id: user._id.toString(),
    displayName: user.isDeleted ? '[deleted user]' : user.displayName,
    photoURL: user.isDeleted ? null : user.photoURL,
  };
}

function userIdsToString(ids: ObjectId[]): string[] {
  return ids.map((id) => id.toString());
}

export function buildUserMap(users: WithId<UserDoc>[]): UserMap {
  return new Map(users.map((u) => [u._id.toString(), u]));
}

export function collectUserIds(comments: WithId<CommentDoc>[]): ObjectId[] {
  const ids = new Map<string, ObjectId>();
  for (const c of comments) ids.set(c.userId.toString(), c.userId);
  return [...ids.values()];
}

export function toCommentDTO(
  c: WithId<CommentDoc>,
  users: UserMap,
  currentUserId: string | null,
): CommentDTO {
  return {
    id: c._id.toString(),
    articleId: c.articleId.toString(),
    parentId: c.parentId ? c.parentId.toString() : null,
    content: c.content,
    author: authorFor(c, users),
    likeCount: c.likedBy.length,
    hasLiked: currentUserId
      ? userIdsToString(c.likedBy).includes(currentUserId)
      : false,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function toCommentListDTO(
  comments: WithId<CommentDoc>[],
  users: UserMap,
  currentUserId: string | null,
): CommentDTO[] {
  return comments.map((c) => toCommentDTO(c, users, currentUserId));
}

export function toCommentWithRepliesDTO(
  comment: WithId<CommentDoc>,
  replies: WithId<CommentDoc>[],
  totalReplies: number,
  users: UserMap,
  currentUserId: string | null,
): CommentWithRepliesDTO {
  return {
    ...toCommentDTO(comment, users, currentUserId),
    replies: replies.map((r) => toCommentDTO(r, users, currentUserId)),
    totalReplies,
  };
}

export function toModerationCommentDTO(
  c: WithId<CommentDoc>,
  users: UserMap,
): ModerationCommentDTO {
  return {
    ...toCommentDTO(c, users, null),
    reportCount: c.reportedBy.length,
    reports: c.reportedBy.map((r) => ({
      userId: r.userId.toString(),
      reason: r.reason,
      at: r.at.toISOString(),
    })),
  };
}

export function toModerationCommentListDTO(
  comments: WithId<CommentDoc>[],
  users: UserMap,
): ModerationCommentDTO[] {
  return comments.map((c) => toModerationCommentDTO(c, users));
}

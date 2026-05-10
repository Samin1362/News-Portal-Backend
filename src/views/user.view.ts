import type { WithId } from 'mongodb';
import type { UserDoc } from '../models/user.model.js';
import type { Role } from '../config/constants.js';

export interface UserDTO {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: Role;
  bio: string;
  isBlocked: boolean;
  isCommentBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export function toUserDTO(user: WithId<UserDoc>): UserDTO {
  return {
    id: user._id.toString(),
    firebaseUid: user.firebaseUid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: user.role,
    bio: user.bio,
    isBlocked: user.isBlocked,
    isCommentBlocked: user.isCommentBlocked,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

export function toUserListDTO(users: WithId<UserDoc>[]): UserDTO[] {
  return users.map(toUserDTO);
}

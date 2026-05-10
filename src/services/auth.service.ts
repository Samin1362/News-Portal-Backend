import type { DecodedIdToken } from 'firebase-admin/auth';
import type { WithId } from 'mongodb';
import { getFirebaseAuth } from '../firebase/firebase.config.js';
import { AppError } from '../utils/AppError.js';
import {
  createUser,
  findByEmail,
  findByFirebaseUid,
  touchLastLogin,
  updateUser,
  type UserDoc,
} from '../models/user.model.js';

export async function verifyIdToken(token: string): Promise<DecodedIdToken> {
  try {
    return await getFirebaseAuth().verifyIdToken(token);
  } catch (err) {
    throw AppError.unauthorized(
      `Invalid or expired Firebase token: ${(err as Error).message}`,
    );
  }
}

export async function syncUser(decoded: DecodedIdToken): Promise<WithId<UserDoc>> {
  if (!decoded.email) {
    throw AppError.badRequest('Firebase token has no email claim');
  }

  const email = decoded.email.toLowerCase();
  const existing = await findByFirebaseUid(decoded.uid);

  if (existing) {
    const patch: Partial<UserDoc> = {};
    if (existing.email !== email) patch.email = email;
    const tokenName = (decoded.name as string | undefined) ?? '';
    if (tokenName && tokenName !== existing.displayName) patch.displayName = tokenName;
    const tokenPicture = (decoded.picture as string | undefined) ?? null;
    if (tokenPicture !== existing.photoURL) patch.photoURL = tokenPicture;

    await touchLastLogin(existing._id);

    if (Object.keys(patch).length > 0) {
      const updated = await updateUser(existing._id, patch);
      if (!updated) throw AppError.notFound('User vanished during sync');
      return updated;
    }
    const refreshed = await findByFirebaseUid(decoded.uid);
    if (!refreshed) throw AppError.notFound('User vanished during sync');
    return refreshed;
  }

  // Email collision check (different firebaseUid, same email)
  const emailMatch = await findByEmail(email);
  if (emailMatch) {
    throw AppError.conflict(
      'Email is already registered to a different account. Contact support to merge.',
    );
  }

  return createUser({
    firebaseUid: decoded.uid,
    email,
    displayName: (decoded.name as string | undefined) ?? email.split('@')[0]!,
    photoURL: (decoded.picture as string | undefined) ?? null,
  });
}

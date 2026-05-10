import type { NextFunction, Request, Response } from 'express';
import type { WithId } from 'mongodb';
import { AppError } from '../utils/AppError.js';
import { verifyIdToken } from '../services/auth.service.js';
import { findByFirebaseUid, type UserDoc } from '../models/user.model.js';

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

function toAuthenticatedUser(user: WithId<UserDoc>): Express.AuthenticatedUser {
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
  };
}

/**
 * Verifies the Firebase ID token and attaches the decoded payload to req.firebaseUser.
 * Does NOT require a Mongo user record. Use on /auth/sync.
 */
export async function verifyFirebase(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearer(req);
    if (!token) throw AppError.unauthorized('Missing or malformed Authorization header');
    req.firebaseUser = await verifyIdToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Verifies the Firebase token AND requires the user to exist in Mongo.
 * Attaches both req.firebaseUser and req.user. Throws 401 if the user has not
 * yet synced (frontend must POST /auth/sync after sign-in).
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearer(req);
    if (!token) throw AppError.unauthorized('Missing or malformed Authorization header');

    const decoded = await verifyIdToken(token);
    req.firebaseUser = decoded;

    const user = await findByFirebaseUid(decoded.uid);
    if (!user) {
      throw AppError.unauthorized('Account not synced. POST /auth/sync first.');
    }
    req.user = toAuthenticatedUser(user);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Like authenticate, but tolerates a missing/invalid token (for endpoints that
 * personalize when the caller is logged in but still work anonymously).
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearer(req);
    if (!token) {
      next();
      return;
    }
    const decoded = await verifyIdToken(token);
    req.firebaseUser = decoded;
    const user = await findByFirebaseUid(decoded.uid);
    if (user) req.user = toAuthenticatedUser(user);
    next();
  } catch {
    // Swallow auth errors on optional path; just continue unauthenticated.
    next();
  }
}

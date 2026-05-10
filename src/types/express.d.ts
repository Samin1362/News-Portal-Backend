import type { DecodedIdToken } from 'firebase-admin/auth';
import type { Role } from '../config/constants.js';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      firebaseUid: string;
      email: string;
      displayName: string;
      photoURL: string | null;
      role: Role;
      bio: string;
      isBlocked: boolean;
      isCommentBlocked: boolean;
    }

    interface Request {
      user?: AuthenticatedUser;
      firebaseUser?: DecodedIdToken;
      validated?: {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };
      requestId?: string;
    }
  }
}

export {};

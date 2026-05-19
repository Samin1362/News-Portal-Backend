import {
  ObjectId,
  type Collection,
  type WithId,
} from 'mongodb';
import { getDb } from '../config/db.js';
import { COLLECTIONS, type OtpPurpose } from '../config/constants.js';

export interface EmailOtpDoc {
  _id: ObjectId;
  email: string;
  codeHash: string;
  purpose: OtpPurpose;
  attempts: number;
  consumed: boolean;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  createdAt: Date;
  /** Set on successful verify; downstream endpoints accept this token to
   *  prove email ownership for the next OTP_VERIFICATION_TOKEN_TTL_SECONDS. */
  verificationToken: string | null;
  verifiedAt: Date | null;
  /** Set when the verificationToken is consumed by a downstream endpoint
   *  (e.g. POST /role-requests). Prevents replay. */
  tokenConsumedAt: Date | null;
}

function collection(): Collection<EmailOtpDoc> {
  return getDb().collection<EmailOtpDoc>(COLLECTIONS.EMAIL_OTPS);
}

export async function createOtp(
  doc: Omit<EmailOtpDoc, '_id'>,
): Promise<WithId<EmailOtpDoc>> {
  const result = await collection().insertOne(doc as EmailOtpDoc);
  return { ...(doc as EmailOtpDoc), _id: result.insertedId };
}

export async function findActiveOtp(
  email: string,
  purpose: OtpPurpose,
): Promise<WithId<EmailOtpDoc> | null> {
  return collection().findOne(
    {
      email: email.toLowerCase(),
      purpose,
      consumed: false,
      expiresAt: { $gt: new Date() },
    },
    { sort: { createdAt: -1 } },
  );
}

export async function incrementAttempts(
  id: ObjectId,
): Promise<WithId<EmailOtpDoc> | null> {
  return collection().findOneAndUpdate(
    { _id: id },
    { $inc: { attempts: 1 } },
    { returnDocument: 'after' },
  );
}

export async function markConsumedWithToken(
  id: ObjectId,
  verificationToken: string,
  tokenExpiresAt: Date,
): Promise<void> {
  await collection().updateOne(
    { _id: id },
    {
      $set: {
        consumed: true,
        verificationToken,
        verifiedAt: new Date(),
        expiresAt: tokenExpiresAt,
      },
    },
  );
}

export async function findActiveVerificationToken(
  token: string,
): Promise<WithId<EmailOtpDoc> | null> {
  return collection().findOne({
    verificationToken: token,
    tokenConsumedAt: null,
    expiresAt: { $gt: new Date() },
  });
}

export async function consumeVerificationToken(id: ObjectId): Promise<void> {
  await collection().updateOne(
    { _id: id },
    { $set: { tokenConsumedAt: new Date() } },
  );
}

export async function countRecentSends(
  email: string,
  purpose: OtpPurpose,
  windowMs: number,
): Promise<number> {
  const since = new Date(Date.now() - windowMs);
  return collection().countDocuments({
    email: email.toLowerCase(),
    purpose,
    createdAt: { $gte: since },
  });
}

export async function countRecentSendsByIp(
  ipAddress: string,
  windowMs: number,
): Promise<number> {
  const since = new Date(Date.now() - windowMs);
  return collection().countDocuments({
    ipAddress,
    createdAt: { $gte: since },
  });
}

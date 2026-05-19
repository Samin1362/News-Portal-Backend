import crypto from 'node:crypto';
import type { WithId } from 'mongodb';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import {
  countRecentSends,
  countRecentSendsByIp,
  createOtp,
  findActiveOtp,
  incrementAttempts,
  markConsumedWithToken,
  findActiveVerificationToken,
  consumeVerificationToken,
  type EmailOtpDoc,
} from '../models/emailOtp.model.js';
import { sendOtpEmail } from './email.service.js';
import type { OtpPurpose } from '../config/constants.js';

const MAX_ATTEMPTS = 5;
const SEND_WINDOW_EMAIL_MS = 15 * 60 * 1000; // 3 sends per email per 15 min
const SEND_LIMIT_EMAIL = 3;
const SEND_WINDOW_IP_MS = 60 * 60 * 1000; // 10 sends per IP per hour
const SEND_LIMIT_IP = 10;

function hashCode(code: string, email: string): string {
  return crypto
    .createHash('sha256')
    .update(`${code}::${email.toLowerCase()}`)
    .digest('hex');
}

function generateCode(length: number): string {
  // Use rejection sampling so the distribution is uniform — important
  // because attackers can model biased PRNG output.
  const max = 10 ** length;
  const bytes = Math.ceil((length * Math.log2(10)) / 8) + 1;
  while (true) {
    const n = parseInt(crypto.randomBytes(bytes).toString('hex'), 16);
    if (n < Math.floor(2 ** (bytes * 8) / max) * max) {
      return (n % max).toString().padStart(length, '0');
    }
  }
}

function generateToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export interface OtpSendInput {
  email: string;
  purpose: OtpPurpose;
  ipAddress: string;
  userAgent: string;
}

export async function sendOtp(input: OtpSendInput): Promise<{ expiresAt: Date }> {
  const email = input.email.toLowerCase();
  const [emailSends, ipSends] = await Promise.all([
    countRecentSends(email, input.purpose, SEND_WINDOW_EMAIL_MS),
    countRecentSendsByIp(input.ipAddress, SEND_WINDOW_IP_MS),
  ]);
  if (emailSends >= SEND_LIMIT_EMAIL) {
    throw new AppError(
      `Too many codes requested for this email. Try again later.`,
      429,
      'OTP_RATE_LIMIT_EMAIL',
    );
  }
  if (ipSends >= SEND_LIMIT_IP) {
    throw new AppError(
      `Too many codes requested from this network. Try again later.`,
      429,
      'OTP_RATE_LIMIT_IP',
    );
  }

  const code = generateCode(env.OTP_LENGTH);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.OTP_EXPIRY_SECONDS * 1000);

  await createOtp({
    email,
    codeHash: hashCode(code, email),
    purpose: input.purpose,
    attempts: 0,
    consumed: false,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    expiresAt,
    createdAt: now,
    verificationToken: null,
    verifiedAt: null,
    tokenConsumedAt: null,
  });

  await sendOtpEmail({
    to: email,
    code,
    expiresInMinutes: Math.round(env.OTP_EXPIRY_SECONDS / 60),
  });

  return { expiresAt };
}

export interface OtpVerifyInput {
  email: string;
  code: string;
  purpose: OtpPurpose;
}

export interface OtpVerifyOutput {
  verificationToken: string;
  expiresAt: Date;
}

export async function verifyOtp(
  input: OtpVerifyInput,
): Promise<OtpVerifyOutput> {
  const email = input.email.toLowerCase();
  const otp = await findActiveOtp(email, input.purpose);
  if (!otp) {
    throw new AppError(
      'No active code for this email. Request a new one.',
      404,
      'OTP_NOT_FOUND',
    );
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    throw new AppError(
      'Too many failed attempts. Request a new code.',
      429,
      'OTP_LOCKED',
    );
  }

  const expectedHash = hashCode(input.code, email);
  const actualHash = otp.codeHash;
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  const actualBuf = Buffer.from(actualHash, 'hex');
  const matched =
    expectedBuf.length === actualBuf.length &&
    crypto.timingSafeEqual(expectedBuf, actualBuf);

  if (!matched) {
    const updated = await incrementAttempts(otp._id);
    const remaining = updated
      ? Math.max(0, MAX_ATTEMPTS - updated.attempts)
      : 0;
    throw new AppError(
      `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      400,
      'OTP_INVALID',
    );
  }

  const verificationToken = generateToken();
  const tokenExpiresAt = new Date(
    Date.now() + env.OTP_VERIFICATION_TOKEN_TTL_SECONDS * 1000,
  );
  await markConsumedWithToken(otp._id, verificationToken, tokenExpiresAt);

  return { verificationToken, expiresAt: tokenExpiresAt };
}

/**
 * Used by downstream endpoints (e.g. POST /role-requests) to confirm the
 * caller proved ownership of `expectedEmail` recently. Throws if token is
 * missing/expired/consumed or the email doesn't match.
 */
export async function consumeToken(args: {
  token: string;
  expectedEmail: string;
}): Promise<WithId<EmailOtpDoc>> {
  const otp = await findActiveVerificationToken(args.token);
  if (!otp) {
    throw new AppError(
      'Email verification token missing, expired, or already used.',
      422,
      'EMAIL_NOT_VERIFIED',
    );
  }
  if (otp.email !== args.expectedEmail.toLowerCase()) {
    throw new AppError(
      'Verification token email does not match the request.',
      422,
      'EMAIL_MISMATCH',
    );
  }
  await consumeVerificationToken(otp._id);
  return otp;
}

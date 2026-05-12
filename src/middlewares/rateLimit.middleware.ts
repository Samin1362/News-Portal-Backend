import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env.js';

const ONE_MINUTE_MS = 60 * 1000;

const sharedOptions: Partial<Options> = {
  windowMs: ONE_MINUTE_MS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

/**
 * Global rate limit applied across the whole API. Tuned via
 * `RATE_LIMIT_GLOBAL_PER_MIN` env var (default 300/minute/IP).
 */
export const globalRateLimiter = rateLimit({
  ...sharedOptions,
  limit: env.RATE_LIMIT_GLOBAL_PER_MIN,
});

/**
 * Stricter limiter for auth flows: 30 requests/minute/IP. Protects
 * `POST /auth/sync` and `GET /auth/me` from brute-force token verification.
 */
export const authRateLimiter = rateLimit({
  ...sharedOptions,
  limit: 30,
});

/**
 * Limiter for comment write operations: 10/minute per authenticated user.
 * Falls back to IP only as a defensive measure — every comment write route
 * already requires authentication, so the user-id path is the normal case.
 *
 * Note: keyGenerator returns IP as plain string; with `trust proxy` already
 * set in app.ts the IP is the real client IP. express-rate-limit v7 handles
 * IPv6 grouping internally for the default IP keying; this custom keyGenerator
 * intentionally treats every distinct IP string as a distinct bucket since
 * the primary key is always the authenticated user id.
 */
export const commentWriteRateLimiter = rateLimit({
  ...sharedOptions,
  limit: 10,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'unknown',
});

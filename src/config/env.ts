import 'dotenv/config';
import { z } from 'zod';

const rawSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5001),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  // Mongo connection. Either `URI` or `MONGODB_URI` works (the former matches the
  // user-supplied .env). DB_USER / DB_PASS are optional — only used if you want to
  // build the URI from parts via the legacy template format.
  URI: z.string().optional(),
  MONGODB_URI: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASS: z.string().optional(),
  DB_NAME: z.string().default('news_portal'),

  RATE_LIMIT_GLOBAL_PER_MIN: z.coerce.number().int().positive().default(300),
  COMMENTS_REQUIRE_APPROVAL: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:5001'),

  // Phase 2 — Firebase Admin. Provide either:
  //   (a) FIREBASE_SERVICE_ACCOUNT_PATH — local dev, or Render Secret Files
  //       (Render mounts uploaded secrets at /etc/secrets/<filename> by default),
  //   (b) FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY —
  //       preferred on hosted platforms; no filesystem dependency.
  // The firebase init helper validates that one of these is satisfied.
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // §0a — Email + OTP infrastructure. RESEND_API_KEY is optional so the
  // server still boots without it; email sends become a no-op + log-only
  // when missing (handy for unit tests / CI / sandbox).
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_FROM: z.string().default('Deligo News <onboarding@resend.dev>'),
  EMAIL_REPLY_TO: z.string().optional(),
  OTP_EXPIRY_SECONDS: z.coerce.number().int().positive().default(600),
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_VERIFICATION_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(900),
  JOURNALIST_GUIDELINES_VERSION: z.string().default('v1'),
  JOURNALIST_GUIDELINES_URL: z
    .string()
    .default('https://deligo.news/journalist-guidelines'),
});

const parsed = rawSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

const data = parsed.data;
const mongoUri = data.URI ?? data.MONGODB_URI;

if (!mongoUri) {
  // eslint-disable-next-line no-console
  console.error(
    'Invalid environment configuration:\n  - URI (or MONGODB_URI) is required',
  );
  process.exit(1);
}

export const env = {
  ...data,
  MONGODB_URI: mongoUri,
};
export type Env = typeof env;

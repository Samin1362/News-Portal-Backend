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
  //   (a) FIREBASE_SERVICE_ACCOUNT_PATH pointing at a service-account JSON file, OR
  //   (b) FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
  // The firebase init helper validates that one of these is satisfied.
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, cert, getApps, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

let app: App | null = null;

function loadServiceAccountFromFile(filePath: string): ServiceAccount {
  const absolute = resolve(filePath);
  try {
    const raw = readFileSync(absolute, 'utf8');
    const parsed = JSON.parse(raw) as ServiceAccount;
    return parsed;
  } catch (err) {
    throw new Error(
      `Failed to load Firebase service account from "${absolute}": ${(err as Error).message}`,
    );
  }
}

function loadServiceAccountFromEnv(): ServiceAccount | null {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    return null;
  }
  return {
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
}

export function initFirebase(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0]!;
    return app;
  }

  let credentials: ServiceAccount | null = null;

  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    credentials = loadServiceAccountFromFile(env.FIREBASE_SERVICE_ACCOUNT_PATH);
  } else {
    credentials = loadServiceAccountFromEnv();
  }

  if (!credentials) {
    throw new Error(
      'Firebase Admin credentials missing. Provide FIREBASE_SERVICE_ACCOUNT_PATH ' +
        'or the FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY triple.',
    );
  }

  app = initializeApp({ credential: cert(credentials) });
  logger.info({ projectId: credentials.projectId }, 'Firebase Admin initialized');
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!app) {
    throw AppError.unauthorized('Firebase Admin not initialized');
  }
  return getAuth(app);
}

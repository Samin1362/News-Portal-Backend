/**
 * One-shot script: create or update a test admin account.
 *
 * Usage (from backend/):
 *   npx tsx scripts/seed-admin.ts                 # uses defaults
 *   ADMIN_EMAIL=foo@bar.test ADMIN_PASSWORD=hunter2 npx tsx scripts/seed-admin.ts
 *
 * Idempotent: re-running rotates the password (Firebase) and re-asserts
 * role=admin (Mongo). Mirrors scripts/seed-editor.ts.
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { getAuth } from 'firebase-admin/auth';
import { initFirebase } from '../src/firebase/firebase.config.js';
import { env } from '../src/config/env.js';
import { COLLECTIONS } from '../src/config/constants.js';

const EMAIL = (process.env.ADMIN_EMAIL ?? 'admin.test@deligo.dev').toLowerCase();
const DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME ?? 'Admin (Test)';
const PASSWORD =
  process.env.ADMIN_PASSWORD ??
  // 18-char URL-safe random — printable, no quoting hazards.
  randomBytes(13).toString('base64url');

async function main(): Promise<void> {
  initFirebase();
  const auth = getAuth();

  // 1. Firebase user — create or rotate password.
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(EMAIL);
    uid = existing.uid;
    await auth.updateUser(uid, { password: PASSWORD, displayName: DISPLAY_NAME });
    console.log(`[firebase] updated existing user ${EMAIL} (uid=${uid})`);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code !== 'auth/user-not-found') throw err;
    const created = await auth.createUser({
      email: EMAIL,
      password: PASSWORD,
      displayName: DISPLAY_NAME,
      emailVerified: true,
    });
    uid = created.uid;
    console.log(`[firebase] created user ${EMAIL} (uid=${uid})`);
  }

  // 2. Mongo user — insert or update with role=admin.
  const client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  try {
    const db = client.db(env.DB_NAME);
    const users = db.collection(COLLECTIONS.USERS);
    const now = new Date();

    const existing = await users.findOne({ $or: [{ firebaseUid: uid }, { email: EMAIL }] });
    if (existing) {
      await users.updateOne(
        { _id: existing._id },
        {
          $set: {
            firebaseUid: uid,
            email: EMAIL,
            displayName: DISPLAY_NAME,
            role: 'admin',
            isBlocked: false,
            isCommentBlocked: false,
            isDeleted: false,
            updatedAt: now,
          },
        },
      );
      console.log(`[mongo] updated user ${existing._id.toString()} → role=admin`);
    } else {
      const doc = {
        _id: new ObjectId(),
        firebaseUid: uid,
        email: EMAIL,
        displayName: DISPLAY_NAME,
        photoURL: null,
        role: 'admin' as const,
        bio: '',
        isBlocked: false,
        isCommentBlocked: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      };
      await users.insertOne(doc);
      console.log(`[mongo] inserted user ${doc._id.toString()} (role=admin)`);
    }
  } finally {
    await client.close();
  }

  console.log('\n=== Test admin credentials ===');
  console.log(`Email:    ${EMAIL}`);
  console.log(`Password: ${PASSWORD}`);
  console.log('===============================\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('seed-admin failed:', err);
  process.exit(1);
});

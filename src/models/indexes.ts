import type { Db } from 'mongodb';
import { COLLECTIONS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Registers MongoDB indexes for all collections.
 * Each phase appends its index registrations here.
 */
export async function createIndexes(db: Db): Promise<void> {
  // --- Phase 2: users ---
  const users = db.collection(COLLECTIONS.USERS);
  await users.createIndexes([
    {
      key: { firebaseUid: 1 },
      name: 'firebaseUid_unique_active',
      unique: true,
      partialFilterExpression: { isDeleted: { $eq: false } },
    },
    {
      key: { email: 1 },
      name: 'email_unique_active',
      unique: true,
      partialFilterExpression: { isDeleted: { $eq: false } },
    },
    { key: { role: 1 }, name: 'role_idx' },
    { key: { createdAt: -1 }, name: 'createdAt_desc' },
  ]);

  logger.info('MongoDB indexes ensured');
}

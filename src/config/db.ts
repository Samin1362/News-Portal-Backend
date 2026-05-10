import { MongoClient, type Db } from 'mongodb';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(env.MONGODB_URI, {
    appName: 'news-portal-backend',
    retryWrites: true,
  });

  await client.connect();
  db = client.db(env.DB_NAME);

  logger.info({ dbName: env.DB_NAME }, 'MongoDB connected');
  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() before getDb().');
  }
  return db;
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB connection closed');
  }
}

export async function pingDB(): Promise<boolean> {
  try {
    if (!db) return false;
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

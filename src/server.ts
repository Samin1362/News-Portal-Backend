import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB, closeDB } from './config/db.js';
import { createIndexes } from './models/indexes.js';
import { initFirebase } from './firebase/firebase.config.js';
import { seedDefaultCategories } from './services/seed.service.js';
import { logger } from './utils/logger.js';

async function bootstrap(): Promise<void> {
  initFirebase();

  const db = await connectDB();
  await createIndexes(db);
  await seedDefaultCategories();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      `News Portal API listening on http://localhost:${env.PORT}`,
    );
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received, closing gracefully');
    server.close(async () => {
      await closeDB();
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after 10s timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to bootstrap application');
  process.exit(1);
});

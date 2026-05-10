import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger.js';
import * as articleWorkflow from './articleWorkflow.service.js';

let publishTask: ScheduledTask | null = null;
let trendingResetTask: ScheduledTask | null = null;

/**
 * Starts the in-process cron scheduler. Idempotent — calling twice is a no-op.
 *
 * Jobs registered:
 *   - `* * * * *`  (every minute)  publish approved articles whose scheduledAt has passed.
 *   - `0 0 * * *`  (midnight UTC)  reset `recentViews` on all published articles (Phase 6 trending).
 */
export function startScheduler(): void {
  if (!publishTask) {
    publishTask = cron.schedule('* * * * *', async () => {
      try {
        await articleWorkflow.publishScheduledArticles();
      } catch (err) {
        logger.error({ err }, 'Scheduler tick failed (publishScheduledArticles)');
      }
    });
    logger.info('Article publish scheduler started (every minute)');
  }

  if (!trendingResetTask) {
    trendingResetTask = cron.schedule('0 0 * * *', async () => {
      try {
        await articleWorkflow.resetTrending();
      } catch (err) {
        logger.error({ err }, 'Scheduler tick failed (resetTrending)');
      }
    });
    logger.info('Trending reset scheduler started (daily at 00:00 UTC)');
  }
}

export function stopScheduler(): void {
  if (publishTask) {
    publishTask.stop();
    publishTask = null;
  }
  if (trendingResetTask) {
    trendingResetTask.stop();
    trendingResetTask = null;
  }
  logger.info('Schedulers stopped');
}

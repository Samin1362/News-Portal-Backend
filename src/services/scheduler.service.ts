import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger.js';
import * as articleWorkflow from './articleWorkflow.service.js';
import * as adService from './ad.service.js';

let publishTask: ScheduledTask | null = null;
let trendingResetTask: ScheduledTask | null = null;
let adDeactivateTask: ScheduledTask | null = null;

/**
 * Starts the in-process cron scheduler. Idempotent — calling twice is a no-op.
 *
 * Jobs registered:
 *   - `* * * * *`   (every minute)        publish approved articles whose scheduledAt has passed.
 *   - `0 0 * * *`   (midnight UTC)        reset `recentViews` on all published articles (Phase 6 trending).
 *   - `30 0 * * *`  (00:30 UTC, daily)    deactivate ads whose endDate has passed (Phase 9).
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

  if (!adDeactivateTask) {
    adDeactivateTask = cron.schedule('30 0 * * *', async () => {
      try {
        await adService.deactivateExpired();
      } catch (err) {
        logger.error({ err }, 'Scheduler tick failed (deactivateExpired ads)');
      }
    });
    logger.info('Ad deactivation scheduler started (daily at 00:30 UTC)');
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
  if (adDeactivateTask) {
    adDeactivateTask.stop();
    adDeactivateTask = null;
  }
  logger.info('Schedulers stopped');
}

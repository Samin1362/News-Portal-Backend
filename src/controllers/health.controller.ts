import type { Request, Response } from 'express';
import { ok } from '../views/apiResponse.js';
import { pingDB } from '../config/db.js';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const dbUp = await pingDB();
  ok(res, {
    status: dbUp ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    db: dbUp ? 'up' : 'down',
    timestamp: new Date().toISOString(),
  });
}

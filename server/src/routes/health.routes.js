/**
 * Health endpoints: /health/live (liveness), /health/ready (readiness).
 */

import express from 'express';
import { getPostgresHealth } from '../platform/db/postgres.js';

const router = express.Router();

router.get('/live', (req, res) => {
  res.status(200).json({ ok: true, status: 'live' });
});

router.get('/ready', async (req, res) => {
  try {
    const health = await getPostgresHealth();
    return res.status(200).json({
      ok: true,
      status: 'ready',
      postgres: 'connected',
      latencyMs: health.latencyMs,
      pooled: health.pooled,
      hasDirectUrl: health.hasDirectUrl,
    });
  } catch {
    return res.status(503).json({
      ok: false,
      status: 'not_ready',
      code: 'DB_UNREACHABLE',
      postgres: 'disconnected',
    });
  }
});

export default router;

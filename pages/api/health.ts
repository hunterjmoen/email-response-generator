import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';
import { HealthMonitor, logger } from '../../utils/monitoring';
import { withRateLimit, rateLimitPresets } from '../../utils/rateLimit';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    logger.setRequestContext(`health-${Date.now()}`);
    logger.info('Health check requested');

    // Check for internal health check authorization (timing-safe comparison)
    const authHeader = req.headers.authorization;
    const expectedAuth = `Bearer ${process.env.HEALTH_CHECK_SECRET}`;

    let isAuthorized = false;
    if (authHeader && authHeader.length === expectedAuth.length) {
      try {
        isAuthorized = timingSafeEqual(
          Buffer.from(authHeader),
          Buffer.from(expectedAuth)
        );
      } catch {
        isAuthorized = false;
      }
    }

    const health = await HealthMonitor.checkHealth();

    // If not authorized, return limited health information
    if (!isAuthorized) {
      const limitedHealth = {
        status: health.status,
        timestamp: health.timestamp,
      };

      const statusCode = health.status === 'healthy' ? 200 :
                        health.status === 'degraded' ? 200 : 503;

      return res.status(statusCode).json(limitedHealth);
    }

    // Full health check response for authorized requests
    const statusCode = health.status === 'healthy' ? 200 :
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed', error as Error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
}

// Apply relaxed rate limiting to health endpoint (300 req/min)
export default withRateLimit(rateLimitPresets.relaxed, handler);
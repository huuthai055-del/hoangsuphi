import { env } from '@/config/env';
import { dbHealthCheck } from '@/lib/database/client';
import { logger } from '@/lib/logger';
import { createApp } from './app';

async function validateBootstrap() {
  logger.info('🔍 Starting Startup Validation Pipeline...');

  // Check DB Connection
  const dbHealth = await dbHealthCheck();
  if (dbHealth.status === 'unhealthy') {
    logger.fatal(
      { error: dbHealth.error },
      '🚨 Startup Validation Failed: Database connection refused!'
    );
    process.exit(1);
  }

  logger.info('✅ Startup Validation Pipeline: ALL SYSTEMS FUNCTIONAL');
}

// Perform startup checks
await validateBootstrap();

const app = createApp();

// Start Bun HTTP Server
const server = Bun.serve({
  port: env.PORT,
  hostname: env.HOST,
  fetch: app.fetch,
});

const banner = `
============================================================
       HOANG SU PHI TOURISM API GATEWAY (Bun Runtime)
============================================================
  Version     : v1.0.0
  Environment : ${env.NODE_ENV}
  Host/Port   : http://${env.HOST}:${env.PORT}
  Database    : Connected (PostgreSQL 16 + PostGIS)
  Logger      : Active (Level: ${env.LOG_LEVEL})
============================================================
`;
console.info(banner);

// Graceful Shutdown System
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn({ signal }, '🛑 Received shutdown signal. Initiating graceful shutdown...');

  // Stop accepting new connections
  server.stop();
  logger.info('HTTP Server stopped accepting new connections');

  // Wait for dynamic drain timeout
  const shutdownTimeoutMs = process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS
    ? Number.parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS, 10)
    : 10000;

  logger.info(`Draining active requests (timeout: ${shutdownTimeoutMs}ms)...`);
  await new Promise((resolve) => setTimeout(resolve, shutdownTimeoutMs));

  logger.warn('👋 API Server gracefully shut down. Exiting process.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

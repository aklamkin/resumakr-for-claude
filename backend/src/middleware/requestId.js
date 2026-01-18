import { randomUUID } from 'crypto';
import { createRequestLogger, log } from '../utils/logger.js';

/**
 * Middleware to add request ID and create request-scoped logger
 * Adds:
 * - req.requestId: Unique identifier for the request
 * - req.log: Child logger with request context
 * - X-Request-ID header on response
 */
export function requestIdMiddleware(req, res, next) {
  // Use existing request ID from header or generate new one
  req.requestId = req.headers['x-request-id'] || randomUUID();

  // Set response header for tracing
  res.setHeader('X-Request-ID', req.requestId);

  // Create request-scoped logger
  req.log = createRequestLogger(
    req.requestId,
    req.path,
    req.method,
    req.user?.id
  );

  next();
}

/**
 * HTTP request logging middleware
 * Logs request completion with timing, status, and context
 */
export function httpLogger(req, res, next) {
  const start = Date.now();

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    log.http(req, res, duration);
  });

  next();
}

export default requestIdMiddleware;

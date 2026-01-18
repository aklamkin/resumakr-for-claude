import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

// Custom format for development - readable colored output
const devFormat = printf(({ level, message, timestamp, requestId, ...meta }) => {
  const reqIdStr = requestId ? `[${requestId.substring(0, 8)}]` : '';
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${level} ${reqIdStr} ${message}${metaStr}`;
});

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create the base logger
const logger = winston.createLogger({
  level: logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    errors({ stack: true })
  ),
  defaultMeta: { service: 'resumakr-api' },
  transports: []
});

// Add console transport with appropriate format
if (process.env.NODE_ENV === 'production') {
  // Production: JSON format for log aggregation
  logger.add(new winston.transports.Console({
    format: combine(
      timestamp(),
      json()
    )
  }));
} else {
  // Development: Readable colored format
  logger.add(new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      devFormat
    )
  }));
}

// Add file transports in production
if (process.env.NODE_ENV === 'production' && process.env.LOG_TO_FILE === 'true') {
  const logsDir = process.env.LOGS_DIR || path.join(__dirname, '../../../logs');

  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: combine(timestamp(), json())
  }));

  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: combine(timestamp(), json())
  }));
}

// Helper to create a child logger with request context
export function createRequestLogger(requestId, path, method, userId = null) {
  return logger.child({
    requestId,
    path,
    method,
    ...(userId && { userId })
  });
}

// Convenience logging methods that include common patterns
export const log = {
  // Standard log levels
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),

  // Domain-specific helpers
  auth: (message, meta = {}) => logger.info(message, { domain: 'auth', ...meta }),
  db: (message, meta = {}) => logger.debug(message, { domain: 'database', ...meta }),
  api: (message, meta = {}) => logger.info(message, { domain: 'api', ...meta }),
  stripe: (message, meta = {}) => logger.info(message, { domain: 'stripe', ...meta }),
  ai: (message, meta = {}) => logger.info(message, { domain: 'ai', ...meta }),

  // HTTP request logging
  http: (req, res, duration) => {
    const level = res.statusCode >= 500 ? 'error'
                : res.statusCode >= 400 ? 'warn'
                : 'info';

    logger.log(level, 'HTTP Request', {
      domain: 'http',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      userId: req.user?.id
    });
  }
};

export default logger;

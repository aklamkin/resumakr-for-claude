import { query } from '../config/database.js';

let cachedMaintenanceMode = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

async function isMaintenanceMode() {
  const now = Date.now();
  if (cachedMaintenanceMode !== null && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedMaintenanceMode;
  }
  try {
    const result = await query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'maintenance_mode'"
    );
    cachedMaintenanceMode = result.rows.length > 0 && result.rows[0].setting_value === 'true';
    cacheTimestamp = now;
    return cachedMaintenanceMode;
  } catch {
    return false;
  }
}

// Paths that are always allowed even in maintenance mode
const ALLOWED_PATHS = [
  '/api/health',
  '/api/settings/public',
  '/api/admin',
  '/api/webhooks',
];

export async function maintenanceCheck(req, res, next) {
  // Allow non-API requests (static files, config app)
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  // Allow paths that must remain accessible
  if (ALLOWED_PATHS.some(p => req.path.startsWith(p))) {
    return next();
  }

  const maintenance = await isMaintenanceMode();
  if (!maintenance) {
    return next();
  }

  return res.status(503).json({
    error: 'Service temporarily unavailable',
    message: 'Resumakr is currently undergoing maintenance. Please try again shortly.',
    maintenance: true
  });
}

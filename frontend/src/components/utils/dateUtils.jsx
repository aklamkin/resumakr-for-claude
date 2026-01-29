// Utility functions for consistent date formatting with timezone awareness

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format a resume date (YYYY-MM or YYYY format) for display.
 * Uses pure string parsing to avoid timezone bugs with Date objects.
 * This is the SINGLE SOURCE OF TRUTH for resume date formatting.
 *
 * @param {string} dateString - Date in YYYY-MM, YYYY, or other format
 * @returns {string} Formatted date like "Jan 2022", "2020", or the original string
 */
export function formatResumeDate(dateString) {
  if (!dateString) return '';

  // Year-only format (e.g., "2020")
  if (/^\d{4}$/.test(dateString)) {
    return dateString;
  }

  // YYYY-MM format (e.g., "2022-01")
  const match = dateString.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const monthIndex = parseInt(match[2], 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${MONTH_NAMES[monthIndex]} ${match[1]}`;
    }
  }

  // Return as-is for any other format (e.g., "January 2020", freeform text)
  return dateString;
}

/**
 * Format a date string to a localized date string (user's timezone)
 * @param {string|Date} dateString - The date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(dateString, options = {}) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return date.toLocaleDateString(undefined, defaultOptions);
}

/**
 * Format a date string to include time (user's timezone)
 * @param {string|Date} dateString - The date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format a date for display in a short format (e.g., "Jan 15")
 * @param {string|Date} dateString - The date to format
 * @returns {string} Short formatted date
 */
export function formatDateShort(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a date for display with year (e.g., "Jan 15, 2025")
 * @param {string|Date} dateString - The date to format
 * @returns {string} Formatted date with year
 */
export function formatDateWithYear(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Check if a date is in the past (accounting for timezone)
 * @param {string|Date} dateString - The date to check
 * @returns {boolean} True if date is in the past
 */
export function isDateInPast(dateString) {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  date.setHours(23, 59, 59, 999); // End of day
  
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today
  
  return date < now;
}

/**
 * Check if a date is in the future (accounting for timezone)
 * @param {string|Date} dateString - The date to check
 * @returns {boolean} True if date is in the future
 */
export function isDateInFuture(dateString) {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0); // Start of day
  
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today
  
  return date > now;
}
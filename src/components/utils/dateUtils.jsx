// Utility functions for consistent date formatting with timezone awareness

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
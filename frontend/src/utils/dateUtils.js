import { formatDistanceToNow } from 'date-fns';

/**
 * Converts UTC timestamp to local Date object
 * @param {string|Date} utcTimestamp - UTC timestamp string or Date object
 * @returns {Date} Local Date object
 */
export const utcToLocal = (utcTimestamp) => {
  if (!utcTimestamp) return null;
  
  // If it's already a Date object, return as is (assuming it's already in local time)
  if (utcTimestamp instanceof Date) {
    return utcTimestamp;
  }
  
  // Parse UTC timestamp string to Date object
  const utcDate = new Date(utcTimestamp);
  
  // The Date constructor automatically converts to local time
  return utcDate;
};

/**
 * Formats UTC timestamp to local date string
 * @param {string|Date} utcTimestamp - UTC timestamp string or Date object
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted local date string
 */
export const formatLocalDate = (utcTimestamp, options = {}) => {
  const localDate = utcToLocal(utcTimestamp);
  if (!localDate) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return localDate.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

/**
 * Formats UTC timestamp to local date and time string
 * @param {string|Date} utcTimestamp - UTC timestamp string or Date object
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted local date and time string
 */
export const formatLocalDateTime = (utcTimestamp, options = {}) => {
  const localDate = utcToLocal(utcTimestamp);
  if (!localDate) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return localDate.toLocaleString('en-US', { ...defaultOptions, ...options });
};

/**
 * Formats UTC timestamp to relative time (e.g., "2 hours ago")
 * @param {string|Date} utcTimestamp - UTC timestamp string or Date object
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (utcTimestamp) => {
  const localDate = utcToLocal(utcTimestamp);
  if (!localDate) return '';
  
  return formatDistanceToNow(localDate, { addSuffix: true });
};

/**
 * Formats UTC timestamp to short date format for compact display
 * @param {string|Date} utcTimestamp - UTC timestamp string or Date object
 * @returns {string} Short date string (MM/DD/YYYY)
 */
export const formatShortDate = (utcTimestamp) => {
  const localDate = utcToLocal(utcTimestamp);
  if (!localDate) return '';
  
  return localDate.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formats UTC timestamp to time only
 * @param {string|Date} utcTimestamp - UTC timestamp string or Date object
 * @returns {string} Time string (HH:MM AM/PM)
 */
export const formatLocalTime = (utcTimestamp) => {
  const localDate = utcToLocal(utcTimestamp);
  if (!localDate) return '';
  
  return localDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

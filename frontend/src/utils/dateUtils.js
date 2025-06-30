import { formatDistanceToNow } from 'date-fns';

// Indian Standard Time timezone identifier
const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Converts UTC timestamp to IST Date object
 * @param {string|Date} utcTimestamp - UTC timestamp string or Date object
 * @returns {Date} Date object representing the same moment in time
 */
export const utcToIST = (utcTimestamp) => {
  if (!utcTimestamp) return null;
  
  // If it's already a Date object, return as is
  if (utcTimestamp instanceof Date) {
    return utcTimestamp;
  }
  
  // Parse UTC timestamp string to Date object
  let utcDate;
  
  if (typeof utcTimestamp === 'string') {
    // Handle different timestamp formats
    if (utcTimestamp.includes('T') && !utcTimestamp.endsWith('Z')) {
      // If it's ISO format but doesn't end with Z, assume it's UTC
      utcDate = new Date(utcTimestamp + 'Z');
    } else {
      // Standard ISO format or other formats
      utcDate = new Date(utcTimestamp);
    }
  } else {
    utcDate = new Date(utcTimestamp);
  }
  
  // Validate the date
  if (isNaN(utcDate.getTime())) {
    console.warn('Invalid timestamp provided to utcToIST:', utcTimestamp);
    return new Date(); // Return current time as fallback
  }
  
  return utcDate;
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use utcToIST instead
 */
export const utcToLocal = utcToIST;

/**
 * Formats UTC timestamp to IST date string
 * @param {string|Date} utcTimestamp - UTC timestamp string or Date object
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted IST date string
 */
export const formatLocalDate = (utcTimestamp, options = {}) => {
  const localDate = utcToIST(utcTimestamp);
  if (!localDate) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: IST_TIMEZONE
  };
  
  return localDate.toLocaleDateString('en-IN', { ...defaultOptions, ...options });
};

/**
 * Formats UTC timestamp to IST date and time string
 * @param {string|Date} utcTimestamp - UTC timestamp string or Date object
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted IST date and time string
 */
export const formatLocalDateTime = (utcTimestamp, options = {}) => {
  const localDate = utcToIST(utcTimestamp);
  if (!localDate) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: IST_TIMEZONE
  };
  
  return localDate.toLocaleString('en-IN', { ...defaultOptions, ...options });
};

/**
 * Formats UTC timestamp to relative time (e.g., "2 hours ago")
 * @param {string|Date} utcTimestamp - UTC timestamp string or Date object
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (utcTimestamp) => {
  console.log('🕐 formatRelativeTime called with:', {
    timestamp: utcTimestamp,
    type: typeof utcTimestamp
  });
  
  const localDate = utcToIST(utcTimestamp);
  if (!localDate) {
    console.warn('🕐 formatRelativeTime: No valid date returned from utcToIST');
    return '';
  }
  
  const result = formatDistanceToNow(localDate, { addSuffix: true });
  
  console.log('🕐 formatRelativeTime result:', {
    originalTimestamp: utcTimestamp,
    convertedDate: localDate,
    localTimeString: localDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    relativeTime: result
  });
  
  return result;
};

/**
 * Formats UTC timestamp to short date format for compact display
 * @param {string|Date} utcTimestamp - UTC timestamp string or Date object
 * @returns {string} Short date string (DD/MM/YYYY)
 */
export const formatShortDate = (utcTimestamp) => {
  const localDate = utcToIST(utcTimestamp);
  if (!localDate) return '';
  
  return localDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: IST_TIMEZONE
  });
};

/**
 * Formats UTC timestamp to time only in IST
 * @param {string|Date} utcTimestamp - UTC timestamp string or Date object
 * @returns {string} Time string (HH:MM AM/PM)
 */
export const formatLocalTime = (utcTimestamp) => {
  const localDate = utcToIST(utcTimestamp);
  if (!localDate) return '';
  
  return localDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: IST_TIMEZONE
  });
};

/**
 * Shared Utility Functions
 * 
 * Contains sanitization and string manipulation utilities used across
 * the application for data validation and cleaning.
 */

/**
 * Removes control characters (ASCII 0-31 and 127) from a string.
 * These characters can cause display issues and potential security problems.
 */
export const sanitizeControlChars = (str: string): string => {
  return str.replace(/[\x00-\x1F\x7F]/g, '');
};

/**
 * Truncates a string to a maximum length, adding ellipsis if truncated.
 */
export const truncateWithEllipsis = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
};


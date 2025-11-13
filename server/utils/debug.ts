/**
 * Debug logging utility
 * Only logs debug messages in development mode to reduce production log noise
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Debug log function that only logs in development
 */
export function debugLog(...args: any[]): void {
  if (isDevelopment) {
    console.log(...args);
  }
}

/**
 * Debug log with a specific tag/prefix
 */
export function debugLogTagged(tag: string, ...args: any[]): void {
  if (isDevelopment) {
    console.log(`[${tag}]`, ...args);
  }
}

/**
 * Always log (for important information even in production)
 */
export function log(...args: any[]): void {
  console.log(...args);
}

/**
 * Always log errors (errors should always be visible)
 */
export function logError(...args: any[]): void {
  console.error(...args);
}

/**
 * Always log warnings (warnings should always be visible)
 */
export function logWarning(...args: any[]): void {
  console.warn(...args);
}


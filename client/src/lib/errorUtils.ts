/**
 * Error Handling Utilities
 * 
 * This module provides centralized error handling utilities for the frontend.
 * It works in conjunction with the backend's errorHandler.ts to provide
 * consistent, user-friendly error messages.
 */

/**
 * Structured error response from backend
 */
interface BackendErrorResponse {
  error: string;
  message: string;
  details?: Array<{ field: string; message: string }> | Record<string, any>;
}

/**
 * Parsed error object for display
 */
export interface ParsedError {
  title: string;
  message: string;
  details?: string;
}

/**
 * Parse error response from fetch/API calls
 * Handles both structured backend errors and generic errors
 */
export async function parseErrorResponse(error: unknown): Promise<ParsedError> {
  // If it's already a Response object
  if (error instanceof Response) {
    try {
      const contentType = error.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData: BackendErrorResponse = await error.json();
        return formatBackendError(errorData, error.status);
      } else {
        const text = await error.text();
        return {
          title: `Error ${error.status}`,
          message: text || error.statusText || 'An unexpected error occurred',
        };
      }
    } catch {
      return {
        title: `Error ${error.status}`,
        message: error.statusText || 'An unexpected error occurred',
      };
    }
  }

  // If it's an Error object
  if (error instanceof Error) {
    // Check if the error message contains a status code and JSON response
    // This handles errors thrown by throwIfResNotOk
    const statusMatch = error.message.match(/^(\d{3}):\s*(.+)$/);
    if (statusMatch) {
      const [, status, body] = statusMatch;
      try {
        const errorData: BackendErrorResponse = JSON.parse(body);
        return formatBackendError(errorData, parseInt(status));
      } catch {
        // Not JSON, use the raw message
        return {
          title: `Error ${status}`,
          message: body,
        };
      }
    }

    return {
      title: 'Error',
      message: error.message,
    };
  }

  // Fallback for unknown error types
  return {
    title: 'Error',
    message: 'An unexpected error occurred',
  };
}

/**
 * Format structured backend error response
 */
function formatBackendError(
  errorData: BackendErrorResponse,
  statusCode?: number
): ParsedError {
  const result: ParsedError = {
    title: errorData.error || 'Error',
    message: errorData.message || 'An error occurred',
  };

  // Format validation error details
  if (errorData.details && Array.isArray(errorData.details)) {
    const fieldErrors = errorData.details
      .map((detail) => `${detail.field}: ${detail.message}`)
      .join('\n');
    if (fieldErrors) {
      result.details = fieldErrors;
    }
  }
  // Format other error details
  else if (errorData.details && typeof errorData.details === 'object') {
    const detailsStr = Object.entries(errorData.details)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    if (detailsStr) {
      result.details = detailsStr;
    }
  }

  // Add status code context if available
  if (statusCode) {
    if (statusCode === 401) {
      result.title = 'Authentication Required';
      result.message = 'Please log in to continue';
    } else if (statusCode === 403) {
      result.title = 'Access Denied';
      result.message = errorData.message || 'You do not have permission to perform this action';
    } else if (statusCode === 404) {
      result.title = 'Not Found';
      result.message = errorData.message || 'The requested resource was not found';
    } else if (statusCode >= 500) {
      result.title = 'Server Error';
      result.message = errorData.message || 'An internal server error occurred';
    }
  }

  return result;
}

/**
 * Get a user-friendly error message from any error
 * Synchronous version for immediate use (doesn't parse Response objects)
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('NetworkError') ||
      error.name === 'NetworkError'
    );
  }
  return false;
}

/**
 * Check if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const statusMatch = error.message.match(/^(\d{3}):/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1]);
      return status === 401;
    }
  }
  return false;
}

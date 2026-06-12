/**
 * Enhanced API Error Handler
 * Provides meaningful error messages and recovery suggestions
 */

export interface ApiError {
  code: string;
  message: string;
  userMessage: string; // User-friendly message
  recoveryAction?: string;
  details?: any;
  statusCode?: number;
  isNetworkError: boolean;
  isTimeoutError: boolean;
  isServerError: boolean;
}

/**
 * Parse fetch errors into meaningful API errors
 */
export function parseApiError(error: unknown, context?: string): ApiError {
  const baseContext = context ? `[${context}] ` : '';

  // Network errors
  if (error instanceof TypeError) {
    if (error.message.includes('Failed to fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        userMessage: 'Cannot reach the server. Please check your internet connection.',
        recoveryAction: 'Check backend is running on http://localhost:5000',
        isNetworkError: true,
        isTimeoutError: false,
        isServerError: false,
      };
    }

    if (error.message.includes('signal is aborted')) {
      return {
        code: 'TIMEOUT_ERROR',
        message: error.message,
        userMessage: 'Request timed out. The server may be slow or offline.',
        recoveryAction: 'Try again or check backend connectivity',
        isNetworkError: false,
        isTimeoutError: true,
        isServerError: false,
      };
    }
  }

  // Generic error
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      userMessage: 'An error occurred. Please try again.',
      details: error,
      isNetworkError: false,
      isTimeoutError: false,
      isServerError: false,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: String(error),
    userMessage: 'An unexpected error occurred.',
    isNetworkError: false,
    isTimeoutError: false,
    isServerError: false,
  };
}

/**
 * Parse HTTP response errors
 */
export function parseResponseError(
  status: number,
  data?: any,
  context?: string
): ApiError {
  const baseContext = context ? `[${context}] ` : '';

  // 4xx errors
  if (status >= 400 && status < 500) {
    if (status === 401) {
      return {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
        userMessage: 'Your session has expired. Please log in again.',
        recoveryAction: 'Redirect to login',
        statusCode: 401,
        isNetworkError: false,
        isTimeoutError: false,
        isServerError: false,
      };
    }

    if (status === 403) {
      return {
        code: 'FORBIDDEN',
        message: 'Forbidden',
        userMessage: 'You do not have permission to access this resource.',
        statusCode: 403,
        isNetworkError: false,
        isTimeoutError: false,
        isServerError: false,
      };
    }

    if (status === 404) {
      return {
        code: 'NOT_FOUND',
        message: 'Not Found',
        userMessage: 'The requested resource was not found.',
        statusCode: 404,
        isNetworkError: false,
        isTimeoutError: false,
        isServerError: false,
      };
    }

    return {
      code: 'CLIENT_ERROR',
      message: `HTTP ${status}`,
      userMessage: data?.message || 'Invalid request. Please check your input.',
      statusCode: status,
      details: data,
      isNetworkError: false,
      isTimeoutError: false,
      isServerError: false,
    };
  }

  // 5xx errors
  if (status >= 500) {
    return {
      code: 'SERVER_ERROR',
      message: `HTTP ${status}`,
      userMessage: 'Server error. Please try again later.',
      recoveryAction: 'Retry the request or contact support',
      statusCode: status,
      details: data,
      isNetworkError: false,
      isTimeoutError: false,
      isServerError: true,
    };
  }

  return {
    code: 'UNKNOWN_HTTP_ERROR',
    message: `HTTP ${status}`,
    userMessage: 'An unexpected error occurred.',
    statusCode: status,
    isNetworkError: false,
    isTimeoutError: false,
    isServerError: false,
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: ApiError): boolean {
  // Retry network/timeout errors
  if (error.isNetworkError || error.isTimeoutError) return true;

  // Retry server errors (5xx)
  if (error.isServerError) return true;

  // Don't retry client errors (4xx) except specific ones
  if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') return false;

  return false;
}

/**
 * Get recovery action for error
 */
export function getRecoveryAction(error: ApiError): {
  action: string;
  label: string;
} | null {
  if (error.isNetworkError) {
    return {
      action: 'retry',
      label: 'Retry',
    };
  }

  if (error.isTimeoutError) {
    return {
      action: 'retry',
      label: 'Try Again',
    };
  }

  if (error.code === 'UNAUTHORIZED') {
    return {
      action: 'logout',
      label: 'Log In Again',
    };
  }

  if (error.isServerError) {
    return {
      action: 'retry',
      label: 'Retry',
    };
  }

  return null;
}

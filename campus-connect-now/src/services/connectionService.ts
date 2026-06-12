/**
 * Connection Service - Backend Health Check & Connection Management
 * Mock version for Client-Only Frontend deployment
 */

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastChecked: Date;
  error?: string;
  latency?: number;
}

// Connection status cache - always true for frontend-only mode
let connectionStatus: ConnectionStatus = {
  isConnected: true,
  lastChecked: new Date(),
  latency: 5,
};

// Observers for connection status changes
const observers: Set<(status: ConnectionStatus) => void> = new Set();

/**
 * Check backend health
 */
export async function checkBackendHealth(): Promise<HealthResponse | null> {
  const startTime = Date.now();
  try {
    const res = await fetch(`${getApiUrl()}/health`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    
    connectionStatus = {
      isConnected: true,
      lastChecked: new Date(),
      latency: Date.now() - startTime,
    };
    notifyObservers();
    return data;
  } catch (err: any) {
    connectionStatus = {
      isConnected: false,
      lastChecked: new Date(),
      error: err.message || 'Server connection failed',
      latency: Date.now() - startTime,
    };
    notifyObservers();
    return null;
  }
}

/**
 * Get current connection status
 */
export function getConnectionStatus(): ConnectionStatus {
  return { ...connectionStatus };
}

/**
 * Subscribe to connection status changes
 */
export function subscribeToConnectionStatus(
  callback: (status: ConnectionStatus) => void
): () => void {
  observers.add(callback);
  // Initial callback
  callback({ ...connectionStatus });
  return () => {
    observers.delete(callback);
  };
}

/**
 * Notify all observers of connection status change
 */
function notifyObservers(): void {
  const status = { ...connectionStatus };
  observers.forEach((callback) => {
    try {
      callback(status);
    } catch (error) {
      console.error('Error in connection status observer:', error);
    }
  });
}

/**
 * Retry logic for API calls - resolved to standard fetch or simple mock response
 */
export async function retryFetch(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fetch(url, options);
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  return fetch(url, options);
}

/**
 * Initialize periodic health checks
 */
export function startHealthCheckInterval(intervalMs: number = 30000): () => void {
  const checkHealth = async () => {
    await checkBackendHealth();
  };

  checkHealth();
  const intervalId = setInterval(checkHealth, intervalMs);

  return () => {
    clearInterval(intervalId);
  };
}

/**
 * Get API base URL
 */
export function getApiUrl(): string {
  return 'http://localhost:5000';
}

/**
 * Format error message for user display
 */
export function getConnectionErrorMessage(): string {
  return connectionStatus.error || 'Backend connection offline. Please check if the server is running.';
}

/**
 * Reset connection status
 */
export function resetConnectionStatus(): void {
  connectionStatus = {
    isConnected: true,
    lastChecked: new Date(),
  };
  notifyObservers();
}

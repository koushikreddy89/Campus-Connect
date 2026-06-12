/**
 * API Configuration - Environment-based setup
 * Handles dev/prod, mobile/desktop, localhost/IP detection
 */

interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  environment: 'development' | 'production';
  isMobileOrEmulator: boolean;
  hostName: string;
}

/**
 * Detect if running on mobile or Android emulator
 */
function detectMobileOrEmulator(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent.toLowerCase();

  // Check for emulator/simulator user agents
  const isAndroidEmulator =
    userAgent.includes('emulator') || userAgent.includes('sdk_google');
  const isIOSSimulator =
    userAgent.includes('iphone') && userAgent.includes('simulator');
  const isMobile =
    /iphone|ipad|ipod|android|webos|blackberry|windows phone/i.test(userAgent);

  return isAndroidEmulator || isIOSSimulator || isMobile;
}

/**
 * Get the appropriate hostname for backend communication
 * For mobile/emulator: use special IPs (10.0.2.2 for Android, 127.0.0.1 for iOS)
 * For desktop: use localhost or custom IP
 */
function getBackendHostname(): string {
  // Always use localhost for development
  // Production should use environment variable
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl !== 'http://localhost:5000') {
    return envUrl;
  }

  const isMobileOrEmulator = detectMobileOrEmulator();

  if (isMobileOrEmulator) {
    // Android emulator special IP
    if (navigator.userAgent.toLowerCase().includes('android')) {
      return 'http://10.0.2.2:5000';
    }
    // iOS simulator
    return 'http://127.0.0.1:5000';
  }

  // Desktop development
  return envUrl || 'http://localhost:5000';
}

/**
 * Initialize API configuration
 */
export function initializeApiConfig(): ApiConfig {
  const isDev = import.meta.env.DEV;
  const isMobileOrEmulator = detectMobileOrEmulator();
  const baseUrl = getBackendHostname();
  const hostName = new URL(baseUrl).hostname;

  return {
    baseUrl,
    timeout: isDev ? 15000 : 10000, // Longer timeout in dev
    retries: isDev ? 3 : 2,
    retryDelay: 1000,
    environment: isDev ? 'development' : 'production',
    isMobileOrEmulator,
    hostName,
  };
}

// Singleton instance
let apiConfig: ApiConfig | null = null;

/**
 * Get current API configuration
 */
export function getApiConfig(): ApiConfig {
  if (!apiConfig) {
    apiConfig = initializeApiConfig();
    logApiConfig(apiConfig);
  }
  return apiConfig;
}

/**
 * Update API configuration at runtime
 */
export function updateApiConfig(newUrl: string): void {
  apiConfig = {
    ...initializeApiConfig(),
    baseUrl: newUrl,
  };
  console.log('📡 API configuration updated:', apiConfig);
}

/**
 * Log API configuration for debugging
 */
function logApiConfig(config: ApiConfig): void {
  console.group('📡 API Configuration');
  console.log('Base URL:', config.baseUrl);
  console.log('Environment:', config.environment);
  console.log('Mobile/Emulator:', config.isMobileOrEmulator);
  console.log('Timeout:', config.timeout + 'ms');
  console.log('Retries:', config.retries);
  console.log('Retry Delay:', config.retryDelay + 'ms');
  console.groupEnd();
}

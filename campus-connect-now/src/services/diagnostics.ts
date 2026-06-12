/**
 * Connection Testing Utility
 * Run diagnostic tests to verify frontend-backend connectivity
 * 
 * Usage in browser console:
 * import { runDiagnostics } from '@/services/diagnostics';
 * await runDiagnostics();
 */

import { getApiConfig } from '@/config/apiConfig';
import { checkBackendHealth } from './connectionService';

export interface DiagnosticResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
  duration?: number;
}

const results: DiagnosticResult[] = [];

/**
 * Run all diagnostic tests
 */
export async function runDiagnostics(): Promise<DiagnosticResult[]> {
  console.group('🔍 Campus Connect Diagnostics');
  results.length = 0; // Reset results

  // Test 1: API Configuration
  await testApiConfiguration();

  // Test 2: Network Connectivity
  await testNetworkConnectivity();

  // Test 3: Backend Health
  await testBackendHealth();

  // Test 4: CORS
  await testCORSConfiguration();

  // Test 5: API Endpoints
  await testApiEndpoints();

  // Summary
  printSummary();
  console.groupEnd();

  return results;
}

/**
 * Test 1: API Configuration
 */
async function testApiConfiguration(): Promise<void> {
  console.group('📋 API Configuration');

  const config = getApiConfig();
  console.log('Configuration:', config);

  if (config.baseUrl && config.baseUrl.length > 0) {
    results.push({
      test: 'API Base URL configured',
      status: 'PASS',
      message: `Using: ${config.baseUrl}`,
      details: config,
    });
  } else {
    results.push({
      test: 'API Base URL configured',
      status: 'FAIL',
      message: 'API base URL not configured',
      details: config,
    });
  }

  if (config.isMobileOrEmulator) {
    results.push({
      test: 'Mobile/Emulator Detection',
      status: 'PASS',
      message: 'Running on mobile/emulator - using special IP',
      details: { isMobileOrEmulator: true, hostname: config.hostName },
    });
  } else {
    results.push({
      test: 'Desktop Environment',
      status: 'PASS',
      message: 'Running on desktop',
      details: { isMobileOrEmulator: false, hostname: config.hostName },
    });
  }

  console.groupEnd();
}

/**
 * Test 2: Network Connectivity
 */
async function testNetworkConnectivity(): Promise<void> {
  console.group('🌐 Network Connectivity');

  try {
    const startTime = performance.now();
    const response = await fetch('http://www.google.com', {
      method: 'HEAD',
      mode: 'no-cors',
    });
    const duration = performance.now() - startTime;

    results.push({
      test: 'Internet Connectivity',
      status: 'PASS',
      message: 'Device has internet connection',
      details: { latency: `${Math.round(duration)}ms` },
      duration,
    });
  } catch (error) {
    results.push({
      test: 'Internet Connectivity',
      status: 'FAIL',
      message: 'No internet connection detected',
      details: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  console.groupEnd();
}

/**
 * Test 3: Backend Health
 */
async function testBackendHealth(): Promise<void> {
  console.group('💚 Backend Health');

  const startTime = performance.now();
  const health = await checkBackendHealth(5000);
  const duration = performance.now() - startTime;

  if (health) {
    results.push({
      test: 'Backend Health Check',
      status: 'PASS',
      message: 'Backend is running and responding',
      details: {
        status: health.status,
        environment: health.environment,
        latency: `${Math.round(duration)}ms`,
      },
      duration,
    });
  } else {
    results.push({
      test: 'Backend Health Check',
      status: 'FAIL',
      message: 'Backend is not responding to health check',
      details: {
        endpoint: `${getApiConfig().baseUrl}/health`,
        timeout: '5000ms',
      },
    });
  }

  console.groupEnd();
}

/**
 * Test 4: CORS Configuration
 */
async function testCORSConfiguration(): Promise<void> {
  console.group('🔐 CORS Configuration');

  const config = getApiConfig();

  try {
    const startTime = performance.now();
    const response = await fetch(`${config.baseUrl}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET',
      },
    });
    const duration = performance.now() - startTime;

    const corsHeaders = {
      allowOrigin: response.headers.get('Access-Control-Allow-Origin'),
      allowMethods: response.headers.get('Access-Control-Allow-Methods'),
      allowCredentials: response.headers.get('Access-Control-Allow-Credentials'),
    };

    if (corsHeaders.allowOrigin) {
      results.push({
        test: 'CORS Configuration',
        status: 'PASS',
        message: 'CORS properly configured',
        details: corsHeaders,
        duration,
      });
    } else {
      results.push({
        test: 'CORS Configuration',
        status: 'WARNING',
        message: 'CORS headers not received',
        details: corsHeaders,
        duration,
      });
    }
  } catch (error) {
    results.push({
      test: 'CORS Configuration',
      status: 'FAIL',
      message: 'CORS check failed',
      details: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  console.groupEnd();
}

/**
 * Test 5: API Endpoints
 */
async function testApiEndpoints(): Promise<void> {
  console.group('📡 API Endpoints');

  const config = getApiConfig();
  const endpoints = [
    { method: 'GET', path: '/health', requiresAuth: false },
    { method: 'GET', path: '/api/colleges', requiresAuth: false },
    { method: 'POST', path: '/api/auth/send-otp', requiresAuth: false },
  ];

  for (const endpoint of endpoints) {
    try {
      const startTime = performance.now();
      const response = await fetch(`${config.baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
      });
      const duration = performance.now() - startTime;

      const status = response.ok ? 'PASS' : 'WARNING';
      results.push({
        test: `${endpoint.method} ${endpoint.path}`,
        status,
        message: `HTTP ${response.status}`,
        details: {
          endpoint: `${endpoint.method} ${endpoint.path}`,
          status: response.status,
          latency: `${Math.round(duration)}ms`,
        },
        duration,
      });
    } catch (error) {
      results.push({
        test: `${endpoint.method} ${endpoint.path}`,
        status: 'FAIL',
        message: 'Endpoint unreachable',
        details: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  console.groupEnd();
}

/**
 * Print diagnostic summary
 */
function printSummary(): void {
  console.group('📊 Summary');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warnings = results.filter((r) => r.status === 'WARNING').length;

  console.table(results);
  console.log(
    `\n✅ Passed: ${passed} | ⚠️ Warnings: ${warnings} | ❌ Failed: ${failed}`
  );

  if (failed === 0 && warnings === 0) {
    console.log(
      '🎉 All systems operational! Frontend-backend connection is working.'
    );
  } else if (failed > 0) {
    console.error(
      '❌ Connection issues detected. Check failed tests and follow troubleshooting guide.'
    );
  } else {
    console.warn(
      '⚠️ Some warnings detected. System may work but could have issues.'
    );
  }

  console.groupEnd();
}

/**
 * Export for testing
 */
export const diagnostics = {
  runDiagnostics,
  testApiConfiguration,
  testNetworkConnectivity,
  testBackendHealth,
  testCORSConfiguration,
  testApiEndpoints,
};

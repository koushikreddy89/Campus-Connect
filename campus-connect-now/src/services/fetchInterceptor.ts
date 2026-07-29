/**
 * Fetch Interceptor - Global API hardener
 * Automatically attaches Authorization headers and sets credentials: 'include'
 * for all outgoing fetch requests to secure HttpOnly cookies and session persistence.
 */

const originalFetch = window.fetch;
const API_BASE = 'http://localhost:5000';

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const options = init || {};
  
  // 1. Enforce credentials include for secure cookie transfers
  options.credentials = 'include';
  
  // 2. Attach Authorization token if available in local storage and not already present
  const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
  let finalInput = input;
  
  if (input instanceof Request) {
    const headers = new Headers(input.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    finalInput = new Request(input, { headers });
  } else {
    if (token) {
      const headers = new Headers(options.headers || {});
      headers.set('Authorization', `Bearer ${token}`);
      console.log(`[API] Authorization Header Attached: Bearer ${token.substring(0, 15)}...`);
      options.headers = headers;
    }
  }
  
  const requestUrl = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
  console.log(`[API] Fetch Request: ${requestUrl}`);

  try {
    const response = await originalFetch(finalInput, options);
    
    // Auto-detect session expiry / unauthorized status and redirect to login if session is revoked
    if (response.status === 401) {
      const isAuthRoute = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/refresh-token') || requestUrl.includes('/auth/verify-mfa');
      if (!isAuthRoute) {
        if (!isRefreshing) {
          isRefreshing = true;
          console.warn('[Auth] Token expired or invalid. Attempting refresh token flow...');
          
          try {
            const refreshResponse = await originalFetch(`${API_BASE}/api/auth/refresh-token`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData.success && refreshData.token) {
                console.log('[Auth] Token refresh successful.');
                localStorage.setItem('token', refreshData.token);
                localStorage.setItem('auth_token', refreshData.token);
                localStorage.setItem('jwt_token', refreshData.token);
                isRefreshing = false;
                onRefreshed(refreshData.token);
              } else {
                throw new Error('Refresh response success flag is false');
              }
            } else {
              throw new Error(`Refresh HTTP error: ${refreshResponse.status}`);
            }
          } catch (refreshErr) {
            console.error('[Auth] Token refresh failed. Clearing session state...', refreshErr);
            isRefreshing = false;
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('token');
            window.dispatchEvent(new CustomEvent('cc-session-expired'));
            return response;
          }
        }
        
        // Wait for token refresh and retry
        return new Promise<Response>((resolve) => {
          subscribeTokenRefresh((newToken) => {
            if (input instanceof Request) {
              const headers = new Headers(input.headers);
              headers.set('Authorization', `Bearer ${newToken}`);
              const retryRequest = new Request(input, { headers });
              resolve(originalFetch(retryRequest, options));
            } else {
              const headers = new Headers(options.headers || {});
              headers.set('Authorization', `Bearer ${newToken}`);
              options.headers = headers;
              resolve(originalFetch(input, options));
            }
          });
        });
      }
    }
    
    return response;
  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
};

/**
 * Fetch Interceptor - Global API hardener
 * Automatically attaches Authorization headers and sets credentials: 'include'
 * for all outgoing fetch requests to secure HttpOnly cookies and session persistence.
 */

const originalFetch = window.fetch;

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const options = init || {};
  
  // 1. Enforce credentials include for secure cookie transfers
  options.credentials = 'include';
  
  // 2. Attach Authorization token if available in local storage and not already present
  const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
  if (token) {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    options.headers = headers;
  }
  
  try {
    const response = await originalFetch(input, options);
    
    // Auto-detect session expiry / unauthorized status and redirect to login if session is revoked
    if (response.status === 401) {
      try {
        const clone = response.clone();
        const body = await clone.json();
        if (body && body.isSessionInvalid) {
          console.warn('Session expired or revoked. Redirecting to auth page...');
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('auth_token');
          // Dispatch a custom event to let the store or router handle redirection
          window.dispatchEvent(new CustomEvent('cc-session-expired'));
        }
      } catch (e) {
        // Not a JSON response, ignore
      }
    }
    
    return response;
  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
};

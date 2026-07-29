/**
 * API Service - Production-Ready Backend Integration
 * Communicates directly with the Express + MongoDB backend APIs.
 */

import { getApiUrl } from './connectionService';
import { useAuthStore } from '@/store/authStore';

// Helper to get authorization headers
function getHeaders(contentType = 'application/json') {
  const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

export const authApi = {
  async getCaptcha() {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/captcha`);
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to get CAPTCHA' };
    }
  },

  async register(payload: any) {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Registration failed' };
    }
  },

  async verifyEmail(email: string, code: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Email verification failed' };
    }
  },

  async login(payload: any) {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('auth_token', data.token);
      }
      return data;
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return { 
          success: false, 
          error: 'Backend server is offline or unreachable. Please ensure server is running at http://localhost:5000.',
          isBackendOffline: true
        };
      }
      return { success: false, error: error.message || 'Login request failed. Please check connection.' };
    }
  },

  async verifyMfa(email: string, code: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('auth_token', data.token);
      }
      return data;
    } catch (error: any) {
      return { error: true, message: error.message || 'MFA verification failed' };
    }
  },

  async forgotPassword(email: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Forgot password failed' };
    }
  },

  async resetPassword(payload: any) {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Reset password failed' };
    }
  },

  async sendOtp(email: string, role: string = 'student') {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      return await res.json();
    } catch (error: any) {
      return {
        error: true,
        message: error.message || 'Failed to send OTP',
      };
    }
  },

  async verifyAlumni(personalEmail: string, rollNumber: string, batch: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/verify-alumni`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalEmail, rollNumber, batch }),
      });
      return await res.json();
    } catch (error: any) {
      return {
        error: true,
        message: error.message || 'Failed to verify alumni record',
      };
    }
  },

  async verifyOtp(email: string, code: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('auth_token', data.token);
      }
      return data;
    } catch (error: any) {
      return {
        error: true,
        message: error.message || 'Failed to verify OTP',
      };
    }
  },

  async logout() {
    try {
      await fetch(`${getApiUrl()}/api/auth/logout`, {
        method: 'POST'
      });
    } catch (e) {}
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('auth_token');
    return { success: true };
  },

  async logoutAll() {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/logout-all`, {
        method: 'POST'
      });
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('auth_token');
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Logout all sessions failed' };
    }
  },

  async getActiveSessions() {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/sessions`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to fetch active sessions' };
    }
  },

  async revokeSession(sessionId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: getHeaders()
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to revoke session' };
    }
  },

  async revokeAllOtherSessions() {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/sessions/revoke-all`, {
        method: 'POST',
        headers: getHeaders()
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to revoke other sessions' };
    }
  }
};

// ============================================
// ADMIN ENDPOINTS
// ============================================
export const adminApi = {
  async getAlumniVerifications() {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/alumni-verifications`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to fetch alumni verifications' };
    }
  },

  async approveAlumni(id: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/alumni-verifications/${id}/approve`, {
        method: 'POST',
        headers: getHeaders()
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to approve alumni' };
    }
  },

  async rejectAlumni(id: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/alumni-verifications/${id}/reject`, {
        method: 'POST',
        headers: getHeaders()
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to reject alumni' };
    }
  },

  async getSecurityLogs() {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/security-logs`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to fetch security logs' };
    }
  },

  async getSecurityMetrics() {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/security/metrics`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to fetch security metrics' };
    }
  },

  async getSecurityLogsPaged(page = 1, limit = 50, event = '', status = '', search = '') {
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (event) query.append('event', event);
      if (status) query.append('status', status);
      if (search) query.append('search', search);

      const res = await fetch(`${getApiUrl()}/api/admin/security/logs?${query.toString()}`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to fetch security logs' };
    }
  },

  async getEnterpriseSecurityLogs(params: {
    page?: number;
    limit?: number;
    email?: string;
    userId?: string;
    status?: string;
    event?: string;
    fromDate?: string;
    toDate?: string;
    sort?: string;
    search?: string;
  }) {
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
      const res = await fetch(`${getApiUrl()}/api/security/logs?${query.toString()}`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to fetch enterprise security logs' };
    }
  },

  async getEnterpriseSecurityLogsSearch(q: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/security/logs/search?q=${encodeURIComponent(q)}`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to search security logs' };
    }
  },

  async getEnterpriseSecurityLogsForUser(userId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/security/logs/${userId}`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to fetch user security logs' };
    }
  },

  getEnterpriseSecurityLogsExportUrl(params: {
    email?: string;
    userId?: string;
    status?: string;
    event?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
  }) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
    if (token) {
      query.append('token', token); // For server auth fallback in browser downloads
      query.append('Authorization', `Bearer ${token}`);
    }
    return `${getApiUrl()}/api/security/logs/export?${query.toString()}`;
  },

  async getColleges() {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/colleges`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to fetch colleges' };
    }
  },

  async addCollege(name: string, domain: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/colleges`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name, domain })
      });
      return await res.json();
    } catch (error: any) {
      return { error: true, message: error.message || 'Failed to add college' };
    }
  }
};

// ============================================
// USER ENDPOINTS
// ============================================

export const userApi = {
  async getCurrentUser() {
    try {
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const res = await fetch(`${getApiUrl()}/api/auth/session`, {
        headers: getHeaders(undefined)
      });
      const result = await res.json();
      if (result.success && result.user) {
        return { success: true, data: result.user };
      }
      throw new Error(result.error || 'Failed to retrieve session');
    } catch (error: any) {
      return {
        error: true,
        message: error.message || 'Failed to fetch user',
      };
    }
  },

  async updateProfile(data: any) {
    try {
      const state = useAuthStore.getState();
      let userId = state.uid;
      let email = state.email;
      if (!userId) {
        const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
        if (token) {
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const decoded = JSON.parse(jsonPayload);
            if (decoded && decoded.userId) {
              userId = decoded.userId;
              email = email || decoded.email;
              useAuthStore.setState({ uid: userId, email: email, role: decoded.role || state.role });
            }
          } catch (e) {
            console.error('Failed to parse JWT token to recover userId:', e);
          }
        }
      }
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const payload = {
        userId,
        email,
        ...data,
        college: state.college || 'MIT'
      };

      const res = await fetch(`${getApiUrl()}/api/student/profile`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to update profile');
      return { success: true, data: result.data };
    } catch (error: any) {
      return {
        error: true,
        message: error.message || 'Failed to update profile',
      };
    }
  },

  async getUserById(id: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/student/profile?userId=${id}`, {
        headers: getHeaders(undefined)
      });
      const result = await res.json();
      if (result.success && result.data) {
        return { success: true, data: result.data };
      }
      throw new Error(result.error || 'User profile not found');
    } catch (error: any) {
      return {
        error: true,
        message: error.message || 'Failed to fetch user',
      };
    }
  },
};

// ============================================
// PROFILE VIEW TRACKING ENDPOINTS (ANALYTICS)
// ============================================

export const profileViewApi = {
  async trackProfileView(viewerId: string, viewedUserId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/student/profile/view`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ viewerId, viewedUserId })
      });
      return await res.json();
    } catch (error: any) {
      return {
        error: true,
        message: error.message || 'Failed to track profile view',
      };
    }
  },

  async getMyViewers(limit = 10) {
    try {
      const userId = useAuthStore.getState().uid;
      if (!userId) return { success: true, data: [] };
      const res = await fetch(`${getApiUrl()}/api/student/profile/viewers?userId=${userId}&limit=${limit}`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      return {
        error: true,
        message: error.message || 'Failed to fetch viewers',
      };
    }
  },

  async getUserViewers(userId: string, limit = 10) {
    try {
      const res = await fetch(`${getApiUrl()}/api/student/profile/viewers?userId=${userId}&limit=${limit}`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      return {
        error: true,
        message: error.message || 'Failed to fetch user viewers',
      };
    }
  },

  async clearMyViewers() {
    try {
      const userId = useAuthStore.getState().uid;
      if (!userId) return { success: true };
      const res = await fetch(`${getApiUrl()}/api/student/profile/viewers/clear`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId })
      });
      return await res.json();
    } catch (error: any) {
      return {
        error: true,
        message: error.message || 'Failed to clear viewers',
      };
    }
  },
};

// ============================================
// MATCHING/DISCOVERY ENDPOINTS
// ============================================

export const matchApi = {
  async getSwipePool() {
    try {
      const userId = useAuthStore.getState().uid;
      if (!userId) return { success: true, data: [] };
      const res = await fetch(`${getApiUrl()}/api/discover?userId=${userId}`, {
        headers: getHeaders(undefined)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch swipe pool');
      return { success: true, data: result.data || [] };
    } catch (error: any) {
      console.error('Error fetching swipe pool:', error);
      return { success: true, data: [] };
    }
  },

  async sendConnectionRequest(toUserId: string) {
    try {
      const fromUserId = useAuthStore.getState().uid;
      if (!fromUserId) return { success: false, error: 'Unauthorized' };
      const res = await fetch(`${getApiUrl()}/api/connections/request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ fromUserId, toUserId, action: 'connect' })
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error sending connection request:', error);
      return { success: false, error: error.message };
    }
  },

  async passUser(toUserId: string) {
    try {
      const fromUserId = useAuthStore.getState().uid;
      if (!fromUserId) return { success: false, error: 'Unauthorized' };
      const res = await fetch(`${getApiUrl()}/api/connections/request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ fromUserId, toUserId, action: 'pass' })
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error passing user:', error);
      return { success: false, error: error.message };
    }
  },

  async getConnectionRequests() {
    try {
      const userId = useAuthStore.getState().uid;
      if (!userId) return { success: true, data: [] };
      const res = await fetch(`${getApiUrl()}/api/notifications?userId=${userId}`, {
        headers: getHeaders(undefined)
      });
      const result = await res.json();
      const requests = (result.data || []).filter((n: any) => n.type === 'request');
      
      const mappedRequests = requests.map((n: any) => ({
        id: n._id || n.id,
        fromUserId: n.relatedId,
        fromUser: {
          id: n.relatedId,
          name: n.title.replace('New Connection Request', '').trim() || 'A Student',
          photos: ['https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'],
          bio: n.body
        },
        createdAt: n.createdAt
      }));
      
      return { success: true, data: mappedRequests };
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      return { success: true, data: [] };
    }
  },

  async acceptRequest(requestId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/connections/accept`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ requestId })
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error accepting request:', error);
      return { success: false, error: error.message };
    }
  },

  async getMatches() {
    try {
      const userId = useAuthStore.getState().uid;
      if (!userId) return { success: true, data: [] };
      const res = await fetch(`${getApiUrl()}/api/connections?userId=${userId}`, {
        headers: getHeaders(undefined)
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error fetching matches:', error);
      return { success: true, data: [] };
    }
  },

  async revealIdentity(matchId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/connections/${matchId}/reveal`, {
        method: 'POST',
        headers: getHeaders()
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error revealing identity:', error);
      return { success: false, error: error.message };
    }
  },

  async removeConnection(friendId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/connections/remove`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ friendId })
      });
      return await res.json();
    } catch (error: any) {
      console.error('Error removing connection:', error);
      return { success: false, error: error.message };
    }
  },

  async getBlockedUsers() {
    try {
      const res = await fetch(`${getApiUrl()}/api/privacy-settings`, {
        headers: getHeaders(undefined)
      });
      const result = await res.json();
      if (result.success && result.privacySettings) {
        return { success: true, data: result.privacySettings.blockedUsers || [] };
      }
      return { success: false, data: [] };
    } catch (error: any) {
      console.error('Error fetching blocked users:', error);
      return { success: false, data: [] };
    }
  },

  async resolveConnection(friendId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/connections/resolve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ friendId })
      });
      return await res.json();
    } catch (error: any) {
      console.error('Error resolving connection:', error);
      return { success: false, error: error.message };
    }
  },
};

// ============================================
// MESSAGING ENDPOINTS
// ============================================

export const chatApi = {
  async getChats() {
    return matchApi.getMatches();
  },

  async getMessages(chatId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/chats/${chatId}/messages`, {
        headers: getHeaders(undefined)
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error getting messages:', error);
      return { success: true, data: [] };
    }
  },

  async sendMessage(chatId: string, text: string, messageType: 'text' | 'image' | 'file' | 'document' | 'link' = 'text', attachments: any[] = [], retentionMode?: 'VIEW_ONCE' | 'NEVER_DELETE') {
    try {
      const senderId = useAuthStore.getState().uid;
      const res = await fetch(`${getApiUrl()}/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ senderId, text, messageType, attachments, retentionMode })
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  },

  async uploadFile(chatId: string, file: File, onProgress?: (pct: number) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('files', file);

      xhr.open('POST', `${getApiUrl()}/api/chats/${chatId}/upload`);
      
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            onProgress(pct);
          }
        };
      }

      xhr.onload = () => {
        try {
          const contentType = xhr.getResponseHeader('content-type');
          if (contentType && !contentType.includes('application/json')) {
            reject(new Error('Server returned a non-JSON response during file upload.'));
            return;
          }
          const res = JSON.parse(xhr.responseText);
          resolve(res);
        } catch (err) {
          reject(new Error('Failed to parse server upload response.'));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during file upload.'));
      };

      xhr.send(formData);
    });
  },

  async forwardMessage(targetRoomIds: string[], messageId: string, caption?: string, messageType?: 'text' | 'image' | 'file', attachments?: any[]) {
    try {
      const res = await fetch(`${getApiUrl()}/api/chats/forward`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ targetRoomIds, messageId, caption, messageType, attachments })
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error forwarding message:', error);
      return { success: false, error: error.message };
    }
  },

  async reactToMessage(chatId: string, messageId: string, emoji: string) {
    try {
      const userId = useAuthStore.getState().uid;
      const res = await fetch(`${getApiUrl()}/api/chats/${chatId}/messages/${messageId}/react`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ emoji, userId })
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error reacting to message:', error);
      return { success: false, error: error.message };
    }
  },

  async markAsRead(chatId: string, messageId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/chats/${chatId}/messages/${messageId}/read`, {
        method: 'POST',
        headers: getHeaders()
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error marking message read:', error);
      return { success: false, error: error.message };
    }
  },

  async markAllAsRead(chatId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/chats/${chatId}/read-all`, {
        method: 'POST',
        headers: getHeaders()
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error marking all messages read:', error);
      return { success: false, error: error.message };
    }
  },

  async replyToMessage(messageId: string, text: string, messageType: 'text' | 'image' | 'file' | 'document' | 'link' = 'text') {
    try {
      const res = await fetch(`${getApiUrl()}/api/messages/${messageId}/reply`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ text, messageType })
      });
      return await res.json();
    } catch (error: any) {
      console.error('Error replying to message:', error);
      return { success: false, error: error.message };
    }
  },

  async pinMessage(messageId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/messages/${messageId}/pin`, {
        method: 'POST',
        headers: getHeaders()
      });
      return await res.json();
    } catch (error: any) {
      console.error('Error pinning message:', error);
      return { success: false, error: error.message };
    }
  },

  async bookmarkMessage(messageId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/messages/${messageId}/bookmark`, {
        method: 'POST',
        headers: getHeaders()
      });
      return await res.json();
    } catch (error: any) {
      console.error('Error bookmarking message:', error);
      return { success: false, error: error.message };
    }
  },

  async shareMessage(messageId: string, targetMatchId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/messages/${messageId}/share`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ targetMatchId })
      });
      return await res.json();
    } catch (error: any) {
      console.error('Error sharing message:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteMessageForMe(messageId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/messages/${messageId}/me`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await res.json();
    } catch (error: any) {
      console.error('Error deleting message for me:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteMessageForEveryone(messageId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/messages/${messageId}/everyone`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await res.json();
    } catch (error: any) {
      console.error('Error deleting message for everyone:', error);
      return { success: false, error: error.message };
    }
  },

  async getMessageDetails(messageId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/messages/${messageId}/details`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      console.error('Error getting message details:', error);
      return { success: false, error: error.message };
    }
  },
};

// ============================================
// GROUP CHAT ENDPOINTS
// ============================================

export const groupChatApi = {
  async getGroups() {
    try {
      const userId = useAuthStore.getState().uid;
      if (!userId) return { success: true, data: [] };
      const res = await fetch(`${getApiUrl()}/api/groups?userId=${userId}`, {
        headers: getHeaders(undefined)
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error getting groups:', error);
      return { success: true, data: [] };
    }
  },

  async createGroup(name: string, memberIds: string[]) {
    try {
      const createdBy = useAuthStore.getState().uid;
      const res = await fetch(`${getApiUrl()}/api/groups`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name, memberIds, createdBy })
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error creating group:', error);
      return { success: false, error: error.message };
    }
  },

  async getGroupMessages(groupId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/groups/${groupId}/messages`, {
        headers: getHeaders(undefined)
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error getting group messages:', error);
      return { success: true, data: [] };
    }
  },

  async sendGroupMessage(groupId: string, text: string) {
    try {
      const senderId = useAuthStore.getState().uid;
      const res = await fetch(`${getApiUrl()}/api/groups/${groupId}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ senderId, text })
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error sending group message:', error);
      return { success: false, error: error.message };
    }
  },
};

// ============================================
// FEED/POST ENDPOINTS
// ============================================

export const feedApi = {
  async getPosts(category = 'all', page = 1) {
    try {
      const userId = useAuthStore.getState().uid || '';
      const queryParams = new URLSearchParams();
      if (category && category !== 'all') queryParams.append('category', category);
      if (userId) queryParams.append('userId', userId);
      
      const res = await fetch(`${getApiUrl()}/api/feed?${queryParams.toString()}`, {
        headers: getHeaders(undefined)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch feed');
      return result.data || [];
    } catch (error: any) {
      console.error('Failed to get feed:', error);
      return [];
    }
  },

  async createPost(
    content: string,
    isAnonymous = false,
    category = 'general',
    image?: string
  ) {
    try {
      const userId = useAuthStore.getState().uid;
      if (!userId) throw new Error('Unauthorized');
      const res = await fetch(`${getApiUrl()}/api/posts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content, isAnonymous, category, image, userId })
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Failed to create post:', error);
      return { success: false, error: error.message };
    }
  },

  async likePost(postId: string) {
    try {
      const userId = useAuthStore.getState().uid;
      if (!userId) throw new Error('Unauthorized');
      const res = await fetch(`${getApiUrl()}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId })
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Failed to like post:', error);
      return { success: false, error: error.message };
    }
  },

  async reactToPost(postId: string, emoji: string) {
    return this.likePost(postId);
  },

  async addComment(postId: string, content: string) {
    try {
      const userId = useAuthStore.getState().uid;
      if (!userId) throw new Error('Unauthorized');
      const res = await fetch(`${getApiUrl()}/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId, content })
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      return { success: false, error: error.message };
    }
  },
};

// ============================================
// STORY ENDPOINTS
// ============================================

export const storyApi = {
  async getStories() {
    try {
      const res = await fetch(`${getApiUrl()}/api/stories`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      console.error('Error fetching stories:', error);
      return { success: true, data: [] };
    }
  },

  async createStory(image: string, caption?: string) {
    try {
      const userId = useAuthStore.getState().uid;
      const res = await fetch(`${getApiUrl()}/api/stories`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId, image, caption, type: 'image' })
      });
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return { success: false, error: 'Server returned a non-JSON response.' };
      }
      return await res.json();
    } catch (error: any) {
      console.error('Error creating story:', error);
      return { success: false, error: error.message };
    }
  },

  async viewStory(storyId: string) {
    try {
      const userId = useAuthStore.getState().uid;
      const res = await fetch(`${getApiUrl()}/api/stories/${storyId}/view`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId })
      });
      return await res.json();
    } catch (error: any) {
      console.error('Error viewing story:', error);
      return { success: false, error: error.message };
    }
  },
};

// ============================================
// NOTIFICATION ENDPOINTS
// ============================================

export const notificationApi = {
  async getNotifications(type = 'all', search = '', page = 1, limit = 20) {
    try {
      const queryParams = new URLSearchParams({
        type,
        search,
        page: String(page),
        limit: String(limit)
      });
      const res = await fetch(`${getApiUrl()}/api/notifications?${queryParams.toString()}`, {
        headers: getHeaders(undefined)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch notifications');
      return result;
    } catch (error: any) {
      console.error('Failed to get notifications:', error);
      return { success: false, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    }
  },

  async markAsRead(notificationIds?: string[]) {
    try {
      const res = await fetch(`${getApiUrl()}/api/notifications/mark-read`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ notificationIds })
      });
      return await res.json();
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
      return { success: false };
    }
  },

  async deleteNotifications(notificationIds: string[]) {
    try {
      const res = await fetch(`${getApiUrl()}/api/notifications/delete`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ notificationIds })
      });
      return await res.json();
    } catch (error: any) {
      console.error('Failed to delete notifications:', error);
      return { success: false };
    }
  },

  async getUnreadCount() {
    try {
      const res = await fetch(`${getApiUrl()}/api/notifications/unread-count`, {
        headers: getHeaders(undefined)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to get unread count');
      return result;
    } catch (error: any) {
      console.error('Failed to get unread count:', error);
      return { success: false, count: 0 };
    }
  }
};

export interface UserPreferencesData {
  userId?: string;
  theme: 'dark' | 'light' | 'system';
  language: 'English' | 'Hindi' | 'Telugu' | 'Tamil' | 'Kannada' | 'Malayalam';
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  notificationSound: 'Default' | 'Chime' | 'Pop' | 'Bell' | 'Campus' | 'Silent' | 'Aurora' | 'Pulse' | 'Zen' | 'Echo' | 'Minimal';
  notificationVolume: number;
  dataSaver: boolean;
  autoPlayVideos: boolean;
  imageQuality: 'Auto' | 'HD' | 'Low Quality';
  mediaCompression: boolean;
  videoHd: boolean;
  wifiOnlyDownloads: boolean;
}

export const preferencesApi = {
  async getPreferences() {
    try {
      const res = await fetch(`${getApiUrl()}/api/preferences`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch preferences' };
    }
  },

  async updatePreferences(data: Partial<UserPreferencesData>) {
    try {
      const res = await fetch(`${getApiUrl()}/api/preferences`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update preferences' };
    }
  },

  async updateTheme(theme: 'dark' | 'light' | 'system') {
    try {
      const res = await fetch(`${getApiUrl()}/api/preferences/theme`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ theme })
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update theme' };
    }
  },

  async updateLanguage(language: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/preferences/language`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ language })
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update language' };
    }
  },

  async updateTimezone(timezone: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/preferences/timezone`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ timezone })
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update timezone' };
    }
  },

  async updateDateFormat(dateFormat?: string, timeFormat?: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/preferences/date-format`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ dateFormat, timeFormat })
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update date format' };
    }
  },

  async updateNotification(sound?: string, volume?: number) {
    try {
      const res = await fetch(`${getApiUrl()}/api/preferences/notification`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ notificationSound: sound, notificationVolume: volume })
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update notifications settings' };
    }
  },

  async updateDataSaver(data: {
    dataSaver?: boolean;
    autoPlayVideos?: boolean;
    imageQuality?: 'Auto' | 'HD' | 'Low Quality';
    mediaCompression?: boolean;
    videoHd?: boolean;
    wifiOnlyDownloads?: boolean;
  }) {
    try {
      const res = await fetch(`${getApiUrl()}/api/preferences/data-saver`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update data saver settings' };
    }
  }
};

export interface UserSettingsData {
  userId?: string;
  readReceipts: boolean;
  activeStatus: boolean;
  typingIndicator: boolean;
  onlinePresence: boolean;
  autoSeen: boolean;
  pushNotifications: boolean;
  soundEffects: boolean;
  messagePreview: boolean;
}

export const settingsApi = {
  async getSettings() {
    try {
      const res = await fetch(`${getApiUrl()}/api/settings`, {
        headers: getHeaders(undefined)
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch settings' };
    }
  },

  async updateSettings(data: Partial<UserSettingsData>) {
    try {
      const res = await fetch(`${getApiUrl()}/api/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update settings' };
    }
  }
};

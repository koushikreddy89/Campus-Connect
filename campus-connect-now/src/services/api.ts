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
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('auth_token');
    return { success: true };
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
      const userId = state.uid;
      const email = state.email;
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

  async sendMessage(chatId: string, text: string) {
    try {
      const senderId = useAuthStore.getState().uid;
      const res = await fetch(`${getApiUrl()}/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ senderId, text })
      });
      const result = await res.json();
      return result;
    } catch (error: any) {
      console.error('Error sending message:', error);
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
  async getNotifications() {
    try {
      const userId = useAuthStore.getState().uid;
      if (!userId) return { success: true, data: [] };
      const res = await fetch(`${getApiUrl()}/api/notifications?userId=${userId}`, {
        headers: getHeaders(undefined)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch notifications');
      return result;
    } catch (error: any) {
      console.error('Failed to get notifications:', error);
      return { success: false, data: [] };
    }
  },

  async markAsRead(notificationId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: getHeaders()
      });
      return await res.json();
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
      return { success: false };
    }
  },
};

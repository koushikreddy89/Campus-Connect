/**
 * Alumni System - Production-Ready Backend Integration
 * Communicates directly with the Express + MongoDB backend APIs.
 */

import {
  AlumniProfile,
  AlumniPost,
  AlumniVideo,
  CreateAlumniProfileInput,
  CreateAlumniPostInput,
  CreateAlumniVideoInput,
  AlumniFilterParams,
  PaginatedResponse,
} from '@/types/alumni';

import { getApiUrl } from './connectionService';
import { useAuthStore } from '@/store/authStore';

// Helper to retrieve Authorization headers for authenticated requests
function getAuthHeaders(contentType = 'application/json') {
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

export const alumniProfileService = {
  /**
   * Get all approved alumni profiles
   */
  getAllProfiles: async (
    collegeId: string,
    filters?: AlumniFilterParams
  ): Promise<PaginatedResponse<AlumniProfile>> => {
    const queryParams = new URLSearchParams();
    if (filters?.searchQuery) queryParams.append('search', filters.searchQuery);
    if (filters?.company && filters.company.length > 0) queryParams.append('company', filters.company.join(','));
    if (filters?.department && filters.department.length > 0) queryParams.append('department', filters.department.join(','));
    if (filters?.batch && filters.batch.length > 0) queryParams.append('batch', filters.batch.join(','));

    const res = await fetch(`${getApiUrl()}/api/alumni?${queryParams.toString()}`, {
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    
    if (!result.success) throw new Error(result.error || 'Failed to fetch profiles');

    const data = (result.data || []).map((p: any) => ({
      ...p,
      id: p.id || p._id
    }));
    return {
      data,
      total: data.length,
      limit: filters?.limit || 10,
      offset: filters?.offset || 0,
      hasMore: false,
    };
  },

  /**
   * Get alumni profile by ID
   */
  getProfileById: async (profileId: string, collegeId: string): Promise<AlumniProfile> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/${profileId}`, {
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch profile');
    const profile = result.data;
    if (profile) {
      profile.id = profile.id || profile._id;
    }
    return profile;
  },

  /**
   * Get current user's alumni profile
   */
  getMyProfile: async (collegeId: string): Promise<AlumniProfile | null> => {
    const userId = useAuthStore.getState().uid;
    if (!userId) return null;
    const res = await fetch(`${getApiUrl()}/api/alumni/profile?userId=${userId}`, {
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success || !result.data) return null;
    const profile = result.data;
    if (profile) {
      profile.id = profile.id || profile._id;
    }
    return profile;
  },

  /**
   * Create new alumni profile
   */
  createProfile: async (
    data: CreateAlumniProfileInput,
    collegeId: string
  ): Promise<AlumniProfile> => {
    const res = await fetch(`${getApiUrl()}/api/alumni`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...data, collegeId })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to create profile');
    const profile = result.data;
    if (profile) {
      profile.id = profile.id || profile._id;
    }
    return profile;
  },

  /**
   * Update alumni profile
   */
  updateProfile: async (
    profileId: string,
    data: Partial<CreateAlumniProfileInput>,
    collegeId: string
  ): Promise<AlumniProfile> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/${profileId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to update profile');
    const profile = result.data;
    if (profile) {
      profile.id = profile.id || profile._id;
    }
    return profile;
  },

  /**
   * Delete alumni profile
   */
  deleteProfile: async (profileId: string, collegeId: string): Promise<void> => {
    await fetch(`${getApiUrl()}/api/alumni/${profileId}`, { 
      method: 'DELETE',
      headers: getAuthHeaders(undefined)
    });
  },

  /**
   * Search alumni profiles
   */
  searchProfiles: async (
    query: string,
    collegeId: string,
    filters?: AlumniFilterParams
  ): Promise<PaginatedResponse<AlumniProfile>> => {
    return alumniProfileService.getAllProfiles(collegeId, {
      ...filters,
      searchQuery: query
    });
  },

  /**
   * Get referrals by alumni ID
   */
  getReferralsByAlumniId: async (alumniId: string): Promise<any[]> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/${alumniId}/referrals`, {
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch referrals');
    return (result.data || []).map((r: any) => ({ ...r, id: r.id || r._id }));
  },

  /**
   * Get roadmaps by alumni ID
   */
  getRoadmapsByAlumniId: async (alumniId: string): Promise<any[]> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/${alumniId}/roadmaps`, {
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch roadmaps');
    return (result.data || []).map((r: any) => ({ ...r, id: r.id || r._id }));
  },

  /**
   * Get resources by alumni ID
   */
  getResourcesByAlumniId: async (alumniId: string): Promise<any[]> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/${alumniId}/resources`, {
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch resources');
    return (result.data || []).map((r: any) => ({ ...r, id: r.id || r._id }));
  },

  /**
   * Get achievements by alumni ID
   */
  getAchievementsByAlumniId: async (alumniId: string): Promise<any[]> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/${alumniId}/achievements`, {
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch achievements');
    return (result.data || []).map((r: any) => ({ ...r, id: r.id || r._id }));
  },

  /**
   * Create referral
   */
  createReferral: async (data: any): Promise<any> => {
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i;
    if (!data.applicationUrl || !urlPattern.test(data.applicationUrl.trim())) {
      throw new Error('Invalid application URL. Please provide a valid web link.');
    }
    const res = await fetch(`${getApiUrl()}/api/alumni/referrals`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to create referral');
    return result.data;
  },

  /**
   * Update referral
   */
  updateReferral: async (id: string, data: any): Promise<any> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/referrals/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to update referral');
    return result.data;
  },

  /**
   * Delete referral
   */
  deleteReferral: async (id: string): Promise<void> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/referrals/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete referral');
  },

  /**
   * Toggle like on referral
   */
  likeReferral: async (id: string, userId: string): Promise<any> => {
    const res = await fetch(`${getApiUrl()}/api/referrals/${id}/like`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to toggle like');
    return result.data;
  },

  /**
   * Toggle save on referral
   */
  saveReferral: async (id: string, userId: string): Promise<any> => {
    const res = await fetch(`${getApiUrl()}/api/referrals/${id}/save`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to toggle save');
    return result.data;
  },

  /**
   * Add comment to referral
   */
  commentReferral: async (id: string, commentData: { userId: string; userName: string; userAvatar?: string; content: string }): Promise<any> => {
    const res = await fetch(`${getApiUrl()}/api/referrals/${id}/comment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(commentData)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to add comment');
    return result.data;
  },

  /**
   * Delete comment from referral
   */
  deleteReferralComment: async (id: string, commentId: string, userId: string): Promise<any> => {
    const res = await fetch(`${getApiUrl()}/api/referrals/${id}/comment/${commentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete comment');
    return result.data;
  },

  /**
   * Get student referrals (with optional filters)
   */
  getStudentReferrals: async (params?: { saved?: boolean; userId?: string }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params?.saved) query.append('saved', 'true');
    if (params?.userId) query.append('userId', params.userId || '');
    const res = await fetch(`${getApiUrl()}/api/student/referrals?${query.toString()}`, {
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch student referrals');
    return (result.data || []).map((r: any) => ({ ...r, id: r.id || r._id }));
  },

  /**
   * Track referral views analytics
   */
  trackReferralView: async (id: string): Promise<void> => {
    await fetch(`${getApiUrl()}/api/referrals/${id}/view`, { 
      method: 'POST',
      headers: getAuthHeaders(undefined)
    });
  },

  /**
   * Track referral clicks analytics
   */
  trackReferralClick: async (id: string): Promise<void> => {
    await fetch(`${getApiUrl()}/api/referrals/${id}/click`, { 
      method: 'POST',
      headers: getAuthHeaders(undefined)
    });
  },

  /**
   * Track referral shares analytics
   */
  trackReferralShare: async (id: string): Promise<void> => {
    await fetch(`${getApiUrl()}/api/referrals/${id}/share`, { 
      method: 'POST',
      headers: getAuthHeaders(undefined)
    });
  },

  /**
   * Track referral applications analytics
   */
  trackReferralApply: async (id: string): Promise<void> => {
    await fetch(`${getApiUrl()}/api/referrals/${id}/apply`, { 
      method: 'POST',
      headers: getAuthHeaders(undefined)
    });
  },

  /**
   * Create roadmap
   */
  createRoadmap: async (data: any): Promise<any> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/roadmaps`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to create roadmap');
    return result.data;
  },

  /**
   * Update roadmap
   */
  updateRoadmap: async (id: string, data: any): Promise<any> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/roadmaps/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to update roadmap');
    return result.data;
  },

  /**
   * Delete roadmap
   */
  deleteRoadmap: async (id: string): Promise<void> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/roadmaps/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete roadmap');
  },

  /**
   * Create resource
   */
  createResource: async (data: any): Promise<any> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/resources`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to create resource');
    return result.data;
  },

  /**
   * Update resource
   */
  updateResource: async (id: string, data: any): Promise<any> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/resources/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to update resource');
    return result.data;
  },

  /**
   * Delete resource
   */
  deleteResource: async (id: string): Promise<void> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/resources/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete resource');
  },

  /**
   * Create achievement
   */
  createAchievement: async (data: any): Promise<any> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/achievements`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to create achievement');
    return result.data;
  },

  /**
   * Update achievement
   */
  updateAchievement: async (id: string, data: any): Promise<any> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/achievements/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to update achievement');
    return result.data;
  },

  /**
   * Delete achievement
   */
  deleteAchievement: async (id: string): Promise<void> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/achievements/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete achievement');
  },
};

export const alumniPostsService = {
  /**
   * Get alumni posts feed
   */
  getFeed: async (
    collegeId: string,
    limit = 10,
    offset = 0
  ): Promise<PaginatedResponse<AlumniPost>> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts`, {
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch posts');
    const data = result.data || [];
    return {
      data,
      total: data.length,
      limit,
      offset,
      hasMore: false,
    };
  },

  /**
   * Get logged-in alumni creator posts
   */
  getMyPosts: async (): Promise<PaginatedResponse<AlumniPost>> => {
    console.log('🚀 [Alumni API] Fetching GET /api/alumni/posts/me with Bearer token');
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/me`, {
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch creator posts');
    const data = result.data || result.posts || [];
    console.log(`✅ [Alumni API] Successfully retrieved ${data.length} creator posts (totalPosts: ${result.totalPosts || data.length})`);
    return {
      data,
      total: result.totalPosts || data.length,
      limit: data.length,
      offset: 0,
      hasMore: false
    };
  },

  /**
   * Get posts by alumni ID
   */
  getPostsByAlumniId: async (
    alumniId: string,
    collegeId: string,
    limit = 10,
    offset = 0
  ): Promise<PaginatedResponse<AlumniPost>> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/${alumniId}/posts`, {
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch posts');
    const data = result.data || [];
    return {
      data,
      total: data.length,
      limit,
      offset,
      hasMore: false,
    };
  },

  /**
   * Create alumni post
   */
  createPost: async (
    data: CreateAlumniPostInput,
    collegeId: string
  ): Promise<AlumniPost> => {
    console.log('🚀 [Alumni API] Dispatching POST /api/alumni/posts payload:', data);
    const res = await fetch(`${getApiUrl()}/api/alumni/posts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...data, collegeId })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to create post');
    console.log('✅ [Alumni API] Post created successfully:', result.data);
    return result.data;
  },

  /**
   * Update alumni post
   */
  updatePost: async (
    postId: string,
    data: Partial<CreateAlumniPostInput>,
    collegeId: string
  ): Promise<AlumniPost> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/${postId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to update post');
    return result.data;
  },

  /**
   * Delete alumni post
   */
  deletePost: async (postId: string, collegeId: string): Promise<void> => {
    await fetch(`${getApiUrl()}/api/alumni/posts/${postId}`, { 
      method: 'DELETE',
      headers: getAuthHeaders(undefined)
    });
  },

  /**
   * Toggle like on alumni post
   */
  likePost: async (postId: string): Promise<any> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/${postId}/like`, { 
      method: 'POST',
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to toggle like');
    return result.data;
  },

  /**
   * Add comment to post
   */
  addComment: async (
    postId: string,
    content: string
  ): Promise<any> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/${postId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to add comment');
    return result.data;
  },

  /**
   * Get post comments
   */
  getComments: async (
    postId: string
  ): Promise<any> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/${postId}/comments`, {
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch comments');
    return {
      comments: result.data || [],
      total: (result.data || []).length
    };
  },

  /**
   * Share post analytics tracking
   */
  sharePost: async (postId: string): Promise<number> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/${postId}/share`, {
      method: 'POST',
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to track share');
    return result.shareCount || 0;
  },

  /**
   * Save / Bookmark post
   */
  savePost: async (postId: string): Promise<boolean> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/${postId}/save`, {
      method: 'POST',
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to toggle save');
    return result.isSaved;
  }
};

export const alumniVideosService = {
  getAllVideos: async () => ({ data: [], total: 0, limit: 10, offset: 0, hasMore: false }),
  getVideosByAlumniId: async () => ({ data: [], total: 0, limit: 10, offset: 0, hasMore: false }),
  getVideoById: async () => ({} as any),
  createVideo: async () => ({} as any),
  updateVideo: async () => ({} as any),
  deleteVideo: async () => {},
  likeVideo: async () => {},
  unlikeVideo: async () => {},
  recordView: async () => {},
};

export const alumniBookmarksService = {
  getBookmarks: async () => [],
  bookmarkAlumni: async () => {},
  unbookmarkAlumni: async () => {},
};

export const adminAlumniService = {
  getPendingProfiles: async (collegeId: string): Promise<AlumniProfile[]> => {
    const res = await fetch(`${getApiUrl()}/api/alumni?status=pending`, {
      headers: getAuthHeaders(undefined)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch pending profiles');
    return (result.data || []).map((p: any) => ({ ...p, id: p.id || p._id }));
  },
  approveProfile: async (profileId: string, collegeId: string): Promise<void> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/${profileId}/approve`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to approve profile');
  },
  rejectProfile: async (profileId: string, collegeId: string): Promise<void> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/${profileId}/reject`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to reject profile');
  },
  approvePost: async (postId: string, collegeId: string): Promise<void> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/${postId}/approve`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to approve post');
  },
};

const AlumniService = {
  posts: alumniPostsService,
  profiles: alumniProfileService,
  videos: alumniVideosService,
  bookmarks: alumniBookmarksService,
  admin: adminAlumniService,
  
  toggleLike: async (postId: string): Promise<boolean> => {
    const data = await alumniPostsService.likePost(postId);
    return data.isLiked;
  },
  
  toggleBookmark: async (postId: string): Promise<boolean> => {
    return await alumniPostsService.savePost(postId);
  },
  
  addComment: async (postId: string, content: string): Promise<any> => {
    return await alumniPostsService.addComment(postId, content);
  },
  
  deletePost: async (postId: string): Promise<boolean> => {
    await alumniPostsService.deletePost(postId, '');
    return true;
  }
};

export default AlumniService;

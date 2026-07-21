/**
 * Alumni Feed Service - Backend Integration
 * Communicates with the Express + MongoDB backend.
 */

import {
  AlumniPostEnhanced,
  AlumniPostComment,
  CreatePostInput,
  UpdatePostInput,
  GetFeedParams,
  FeedResponse,
  FeedSearchParams,
  UserPostStats,
  PostStats,
} from '@/types/alumniPost';

import { getApiUrl } from './connectionService';

const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const postsService = {
  /**
   * Create a new post
   */
  create: async (input: CreatePostInput): Promise<AlumniPostEnhanced> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(input)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to create post');
    return result.data;
  },

  /**
   * Get feed posts
   */
  getFeed: async (params: GetFeedParams = {}): Promise<FeedResponse> => {
    const queryParams = new URLSearchParams();
    if (params.type && params.type !== 'all') queryParams.append('type', params.type);
    if (params.company) queryParams.append('company', params.company);
    if (params.search) queryParams.append('search', params.search);

    const res = await fetch(`${getApiUrl()}/api/alumni/feed?${queryParams.toString()}`, {
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch feed');
    
    const posts = result.data || [];
    return {
      posts,
      total: posts.length,
      page: params.page || 1,
      limit: params.limit || 10,
      hasMore: false
    };
  },

  /**
   * Get single post by ID
   */
  getById: async (postId: string): Promise<AlumniPostEnhanced> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/${postId}`, {
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to get post');
    return result.data;
  },

  /**
   * Update a post
   */
  update: async (postId: string, input: UpdatePostInput): Promise<AlumniPostEnhanced> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/${postId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(input)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to update post');
    return result.data;
  },

  /**
   * Delete a post
   */
  delete: async (postId: string): Promise<void> => {
    await fetch(`${getApiUrl()}/api/alumni/posts/${postId}`, { 
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  },

  /**
   * Get user's own posts
   */
  getMyPosts: async (page: number = 1, limit: number = 10): Promise<FeedResponse> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/my`, {
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch creator posts');
    const posts = result.data || [];
    return {
      posts,
      total: posts.length,
      page,
      limit,
      hasMore: false
    };
  },

  /**
   * Get trending posts
   */
  getTrending: async (limit: number = 10): Promise<AlumniPostEnhanced[]> => {
    const feed = await postsService.getFeed();
    return feed.posts.slice(0, limit);
  },

  /**
   * Get posts by company
   */
  getByCompany: async (
    company: string,
    page: number = 1,
    limit: number = 10
  ): Promise<FeedResponse> => {
    return postsService.getFeed({ company, page, limit });
  },

  /**
   * Get posts statistics
   */
  getStats: async (): Promise<UserPostStats> => {
    const myPostsData = await postsService.getMyPosts();
    const posts = myPostsData.posts || [];
    const totalLikes = posts.reduce((acc, p) => acc + (Array.isArray(p.likes) ? p.likes.length : (p.likes || 0)), 0);
    const totalComments = posts.reduce((acc, p) => acc + (Array.isArray(p.comments) ? p.comments.length : 0), 0);
    const totalViews = posts.reduce((acc, p) => acc + (p.viewCount || 0), 0);

    return { totalPosts: posts.length, totalLikes, totalComments, totalViews };
  },
};

export const engagementService = {
  like: async (postId: string): Promise<{ liked: boolean; likeCount: number }> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/${postId}/like`, { 
      method: 'POST',
      headers: getAuthHeaders()
    });
    const result = await res.json();
    return { liked: result.data?.isLiked ?? result.success, likeCount: result.data?.likesCount ?? 0 };
  },

  createComment: async (
    postId: string,
    content: string
  ): Promise<AlumniPostComment> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ content })
    });
    const result = await res.json();
    return result.data;
  },

  getComments: async (postId: string, page: number = 1, limit: number = 10) => {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/${postId}/comments`);
    const result = await res.json();
    return {
      comments: result.data || [],
      total: (result.data || []).length
    };
  },

  bookmark: async (postId: string): Promise<{ bookmarked: boolean; count: number }> => {
    const res = await fetch(`${getApiUrl()}/api/alumni/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: postId, type: 'post' })
    });
    const result = await res.json();
    return { bookmarked: result.success, count: 0 };
  },

  getBookmarks: async (page: number = 1, limit: number = 10): Promise<FeedResponse> => {
    return { posts: [], total: 0, page, limit, hasMore: false };
  },

  share: async (postId: string, platform: string): Promise<{ success: boolean }> => {
    return { success: true };
  },
};

export const searchService = {
  searchPosts: async (params: FeedSearchParams): Promise<FeedResponse> => {
    return postsService.getFeed({
      search: params.query,
      page: params.page,
      limit: params.limit,
      type: params.type,
      company: params.company
    });
  },

  getSuggestions: async (query: string) => {
    return [];
  },
};

export const analyticsService = {
  getPostStats: async (postId: string): Promise<PostStats> => {
    return { views: 0, likes: 0, comments: 0, shares: 0, ctr: 0 };
  },

  trackView: async (postId: string): Promise<void> => {},
  trackLinkClick: async (postId: string): Promise<void> => {},
};

export const alumniPostService = {
  posts: postsService,
  engagement: engagementService,
  search: searchService,
  analytics: analyticsService,
};

export default alumniPostService;

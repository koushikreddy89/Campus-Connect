/**
 * Premium Alumni Feed API Service - Backend Integration
 * Communicates with the Express + MongoDB backend services.
 */

import { FeedResponse, Comment } from '@/types/feed';
import { getApiUrl } from './connectionService';

interface FetchFeedParams {
  page?: number;
  limit?: number;
  cursor?: string;
  postType?: string;
  tags?: string[];
  sortBy?: 'latest' | 'trending' | 'topLiked';
}

export const feedApi = {
  /**
   * Fetch premium alumni feed
   */
  async getFeed(params: FetchFeedParams): Promise<FeedResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.postType && params.postType !== 'all') queryParams.append('type', params.postType);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);

      const res = await fetch(`${getApiUrl()}/api/alumni/posts?${queryParams.toString()}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch feed');

      return {
        posts: result.data || [],
        hasMore: false,
        total: (result.data || []).length
      };
    } catch (error) {
      console.error('Failed to fetch feed:', error);
      return {
        posts: [],
        hasMore: false,
        total: 0,
      };
    }
  },

  /**
   * Like a post
   */
  async likePost(postId: string): Promise<void> {
    await fetch(`${getApiUrl()}/api/alumni/posts/${postId}/like`, { method: 'POST' });
  },

  /**
   * Unlike a post
   */
  async unlikePost(postId: string): Promise<void> {
    await fetch(`${getApiUrl()}/api/alumni/posts/${postId}/unlike`, { method: 'POST' });
  },

  /**
   * Save a post
   */
  async savePost(postId: string): Promise<void> {
    await fetch(`${getApiUrl()}/api/alumni/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: postId, type: 'post' })
    });
  },

  /**
   * Unsave a post
   */
  async unsavePost(postId: string): Promise<void> {
    await fetch(`${getApiUrl()}/api/alumni/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: postId, type: 'post' })
    });
  },

  /**
   * Get comments for a post
   */
  async getComments(postId: string): Promise<Comment[]> {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/${postId}/comments`);
    const result = await res.json();
    return result.data || [];
  },

  /**
   * Add a comment to a post
   */
  async addComment(postId: string, content: string): Promise<Comment> {
    const res = await fetch(`${getApiUrl()}/api/alumni/posts/${postId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const result = await res.json();
    return result.data;
  },

  /**
   * Share a post
   */
  async sharePost(postId: string): Promise<void> {
    await fetch(`${getApiUrl()}/api/alumni/posts/${postId}/share`, { method: 'POST' });
  },
};

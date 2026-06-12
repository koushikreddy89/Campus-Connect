/**
 * Premium Alumni Feed Store (Zustand)
 * Global state management for premium feed posts, pagination, and interactions
 */

import { create } from 'zustand';
import { FeedPost, FeedResponse, PaginationState, FeedFilter, Comment } from '@/types/feed';
import { feedApi } from '@/services/feedApi';

interface PremiumFeedState {
  // Data
  posts: FeedPost[];
  comments: Record<string, Comment[]>;
  
  // Pagination
  pagination: PaginationState;
  filter: FeedFilter;
  
  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  
  // Actions
  fetchFeed: (filter?: FeedFilter) => Promise<void>;
  loadMorePosts: () => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  savePost: (postId: string) => Promise<void>;
  unsavePost: (postId: string) => Promise<void>;
  fetchComments: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  setFilter: (filter: FeedFilter) => void;
  resetFeed: () => void;
}

export const usePremiumFeedStore = create<PremiumFeedState>((set, get) => ({
  posts: [],
  comments: {},
  
  pagination: {
    page: 1,
    limit: 10,
    hasMore: true,
    isLoading: false,
  },
  filter: { sortBy: 'latest' },
  
  isLoading: false,
  isLoadingMore: false,
  
  fetchFeed: async (filter) => {
    set({ isLoading: true });
    try {
      const response = await feedApi.getFeed({
        page: 1,
        limit: 10,
        ...filter,
      });
      
      set({
        posts: response.posts,
        pagination: {
          page: 1,
          limit: 10,
          hasMore: response.hasMore,
          isLoading: false,
          nextCursor: response.nextCursor,
        },
        filter: filter || { sortBy: 'latest' },
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch feed:', error);
      set({
        isLoading: false,
        pagination: {
          page: 1,
          limit: 10,
          hasMore: false,
          isLoading: false,
          error: 'Failed to load feed',
        },
      });
    }
  },
  
  loadMorePosts: async () => {
    const { pagination, filter, posts } = get();
    
    if (!pagination.hasMore || pagination.isLoading) return;
    
    set({
      isLoadingMore: true,
      pagination: { ...pagination, isLoading: true },
    });
    
    try {
      const response = await feedApi.getFeed({
        page: pagination.page + 1,
        limit: pagination.limit,
        cursor: pagination.nextCursor,
        ...filter,
      });
      
      set({
        posts: [...posts, ...response.posts],
        pagination: {
          page: pagination.page + 1,
          limit: pagination.limit,
          hasMore: response.hasMore,
          isLoading: false,
          nextCursor: response.nextCursor,
        },
        isLoadingMore: false,
      });
    } catch (error) {
      console.error('Failed to load more posts:', error);
      set({
        isLoadingMore: false,
        pagination: {
          ...pagination,
          isLoading: false,
          error: 'Failed to load more posts',
        },
      });
    }
  },
  
  likePost: async (postId: string) => {
    // Optimistic update
    const posts = get().posts;
    set({
      posts: posts.map(p =>
        p.id === postId
          ? { ...p, isLiked: true, likes: p.likes + 1 }
          : p
      ),
    });
    
    try {
      await feedApi.likePost(postId);
    } catch (error) {
      console.error('Failed to like post:', error);
      // Revert optimistic update
      set({
        posts: posts.map(p =>
          p.id === postId
            ? { ...p, isLiked: false, likes: p.likes - 1 }
            : p
        ),
      });
    }
  },
  
  unlikePost: async (postId: string) => {
    // Optimistic update
    const posts = get().posts;
    set({
      posts: posts.map(p =>
        p.id === postId
          ? { ...p, isLiked: false, likes: Math.max(0, p.likes - 1) }
          : p
      ),
    });
    
    try {
      await feedApi.unlikePost(postId);
    } catch (error) {
      console.error('Failed to unlike post:', error);
      // Revert optimistic update
      set({
        posts: posts.map(p =>
          p.id === postId
            ? { ...p, isLiked: true, likes: p.likes + 1 }
            : p
        ),
      });
    }
  },
  
  savePost: async (postId: string) => {
    // Optimistic update
    const posts = get().posts;
    set({
      posts: posts.map(p =>
        p.id === postId
          ? { ...p, isSaved: true, saves: p.saves + 1 }
          : p
      ),
    });
    
    try {
      await feedApi.savePost(postId);
    } catch (error) {
      console.error('Failed to save post:', error);
      // Revert optimistic update
      set({
        posts: posts.map(p =>
          p.id === postId
            ? { ...p, isSaved: false, saves: p.saves - 1 }
            : p
        ),
      });
    }
  },
  
  unsavePost: async (postId: string) => {
    // Optimistic update
    const posts = get().posts;
    set({
      posts: posts.map(p =>
        p.id === postId
          ? { ...p, isSaved: false, saves: Math.max(0, p.saves - 1) }
          : p
      ),
    });
    
    try {
      await feedApi.unsavePost(postId);
    } catch (error) {
      console.error('Failed to unsave post:', error);
      // Revert optimistic update
      set({
        posts: posts.map(p =>
          p.id === postId
            ? { ...p, isSaved: true, saves: p.saves + 1 }
            : p
        ),
      });
    }
  },
  
  fetchComments: async (postId: string) => {
    try {
      const comments = await feedApi.getComments(postId);
      set(state => ({
        comments: {
          ...state.comments,
          [postId]: comments,
        },
      }));
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  },
  
  addComment: async (postId: string, content: string) => {
    try {
      const newComment = await feedApi.addComment(postId, content);
      
      set(state => ({
        comments: {
          ...state.comments,
          [postId]: [...(state.comments[postId] || []), newComment],
        },
        posts: state.posts.map(p =>
          p.id === postId
            ? { ...p, comments: p.comments + 1 }
            : p
        ),
      }));
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  },
  
  setFilter: (filter: FeedFilter) => {
    set(state => ({
      filter: { ...state.filter, ...filter },
    }));
  },
  
  resetFeed: () => {
    set({
      posts: [],
      comments: {},
      pagination: {
        page: 1,
        limit: 10,
        hasMore: true,
        isLoading: false,
      },
      filter: { sortBy: 'latest' },
      isLoading: false,
      isLoadingMore: false,
    });
  },
}));

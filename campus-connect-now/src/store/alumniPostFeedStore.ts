/**
 * Alumni Post Feed Store
 * Manages alumni feed state, filters, search, and posts
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  AlumniPostEnhanced,
  PostType,
  FeedFilterParams,
  UserPostStats,
  FEED_PAGINATION_LIMIT,
} from '@/types/alumniPost';

// ============================================
// Store State Types
// ============================================

interface AlumniPostFeedState {
  // Feed data
  posts: AlumniPostEnhanced[];
  totalPosts: number;
  hasMore: boolean;

  // Pagination
  currentPage: number;
  pageSize: number;

  // Filters & Search
  selectedType: PostType | null;
  selectedCompany: string | null;
  searchQuery: string;
  sortBy: 'recent' | 'trending' | 'popular';

  // UI State
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;

  // User data
  userStats: UserPostStats | null;
  bookmarkedPostIds: Set<string>;

  // Real-time
  unreadCount: number;
}

interface AlumniPostFeedActions {
  // Posts
  setPosts: (posts: AlumniPostEnhanced[]) => void;
  addPosts: (posts: AlumniPostEnhanced[], append: boolean) => void;
  updatePost: (postId: string, updates: Partial<AlumniPostEnhanced>) => void;
  removePost: (postId: string) => void;
  setTotal: (total: number) => void;
  setHasMore: (hasMore: boolean) => void;

  // Pagination
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  resetPagination: () => void;

  // Filters
  setSelectedType: (type: PostType | null) => void;
  setSelectedCompany: (company: string | null) => void;
  clearFilters: () => void;

  // Search
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // Sorting
  setSortBy: (sortBy: 'recent' | 'trending' | 'popular') => void;

  // UI State
  setLoading: (isLoading: boolean) => void;
  setSearching: (isSearching: boolean) => void;
  setError: (error: string | null) => void;

  // User data
  setUserStats: (stats: UserPostStats | null) => void;
  setBookmarkedPostIds: (ids: Set<string>) => void;
  toggleBookmark: (postId: string) => void;

  // Like handling
  togglePostLike: (postId: string) => void;

  // Real-time
  incrementUnreadCount: () => void;
  resetUnreadCount: () => void;

  // Reset
  reset: () => void;
}

type AlumniPostFeedStore = AlumniPostFeedState & AlumniPostFeedActions;

// ============================================
// Initial State
// ============================================

const initialState: AlumniPostFeedState = {
  posts: [],
  totalPosts: 0,
  hasMore: true,
  currentPage: 1,
  pageSize: FEED_PAGINATION_LIMIT,
  selectedType: null,
  selectedCompany: null,
  searchQuery: '',
  sortBy: 'recent',
  isLoading: false,
  isSearching: false,
  error: null,
  userStats: null,
  bookmarkedPostIds: new Set<string>(),
  unreadCount: 0,
};

// ============================================
// Store Creation
// ============================================

export const useAlumniPostFeedStore = create<AlumniPostFeedStore>()(
  immer((set) => ({
    ...initialState,

    // Posts
    setPosts: (posts) =>
      set((state) => {
        state.posts = posts;
      }),

    addPosts: (posts, append) =>
      set((state) => {
        state.posts = append ? [...state.posts, ...posts] : posts;
      }),

    updatePost: (postId, updates) =>
      set((state) => {
        const post = state.posts.find((p) => p.id === postId);
        if (post) {
          Object.assign(post, updates);
        }
      }),

    removePost: (postId) =>
      set((state) => {
        state.posts = state.posts.filter((p) => p.id !== postId);
      }),

    setTotal: (total) =>
      set((state) => {
        state.totalPosts = total;
      }),

    setHasMore: (hasMore) =>
      set((state) => {
        state.hasMore = hasMore;
      }),

    // Pagination
    setCurrentPage: (page) =>
      set((state) => {
        state.currentPage = page;
      }),

    nextPage: () =>
      set((state) => {
        state.currentPage += 1;
      }),

    resetPagination: () =>
      set((state) => {
        state.currentPage = 1;
      }),

    // Filters
    setSelectedType: (type) =>
      set((state) => {
        state.selectedType = type;
        state.currentPage = 1; // Reset to first page when filtering
      }),

    setSelectedCompany: (company) =>
      set((state) => {
        state.selectedCompany = company;
        state.currentPage = 1;
      }),

    clearFilters: () =>
      set((state) => {
        state.selectedType = null;
        state.selectedCompany = null;
        state.currentPage = 1;
      }),

    // Search
    setSearchQuery: (query) =>
      set((state) => {
        state.searchQuery = query;
        state.currentPage = 1;
      }),

    clearSearch: () =>
      set((state) => {
        state.searchQuery = '';
        state.currentPage = 1;
      }),

    // Sorting
    setSortBy: (sortBy) =>
      set((state) => {
        state.sortBy = sortBy;
        state.currentPage = 1;
      }),

    // UI State
    setLoading: (isLoading) =>
      set((state) => {
        state.isLoading = isLoading;
      }),

    setSearching: (isSearching) =>
      set((state) => {
        state.isSearching = isSearching;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    // User data
    setUserStats: (stats) =>
      set((state) => {
        state.userStats = stats;
      }),

    setBookmarkedPostIds: (ids) =>
      set((state) => {
        state.bookmarkedPostIds = ids;
      }),

    toggleBookmark: (postId) =>
      set((state) => {
        const post = state.posts.find((p) => p.id === postId);
        if (!post) return;

        if (state.bookmarkedPostIds.has(postId)) {
          state.bookmarkedPostIds.delete(postId);
          post.currentUserBookmarked = false;
          post.bookmarks = Math.max(0, post.bookmarks - 1);
        } else {
          state.bookmarkedPostIds.add(postId);
          post.currentUserBookmarked = true;
          post.bookmarks += 1;
        }
      }),

    // Like handling
    togglePostLike: (postId) =>
      set((state) => {
        const post = state.posts.find((p) => p.id === postId);
        if (!post) return;

        if (post.currentUserLiked) {
          post.currentUserLiked = false;
          post.likes = Math.max(0, post.likes - 1);
        } else {
          post.currentUserLiked = true;
          post.likes += 1;
        }
      }),

    // Real-time
    incrementUnreadCount: () =>
      set((state) => {
        state.unreadCount += 1;
      }),

    resetUnreadCount: () =>
      set((state) => {
        state.unreadCount = 0;
      }),

    // Reset
    reset: () => set(initialState),
  }))
);

// ============================================
// Store Selectors (for performance)
// ============================================

export const selectAlumniPosts = (state: AlumniPostFeedStore) => state.posts;
export const selectAlumniPostsLoading = (state: AlumniPostFeedStore) => state.isLoading;
export const selectAlumniPostsError = (state: AlumniPostFeedStore) => state.error;
export const selectSelectedType = (state: AlumniPostFeedStore) => state.selectedType;
export const selectSelectedCompany = (state: AlumniPostFeedStore) => state.selectedCompany;
export const selectSearchQuery = (state: AlumniPostFeedStore) => state.searchQuery;
export const selectCurrentPage = (state: AlumniPostFeedStore) => state.currentPage;
export const selectHasMore = (state: AlumniPostFeedStore) => state.hasMore;
export const selectSortBy = (state: AlumniPostFeedStore) => state.sortBy;
export const selectUserStats = (state: AlumniPostFeedStore) => state.userStats;
export const selectBookmarkedPostIds = (state: AlumniPostFeedStore) => state.bookmarkedPostIds;
export const selectUnreadCount = (state: AlumniPostFeedStore) => state.unreadCount;

/**
 * Alumni System - Zustand Store
 * Manages alumni profiles, posts, videos, and user engagement
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';
import {
  AlumniProfile,
  AlumniPost,
  AlumniVideo,
  AlumniFilterParams,
  AlumniSearchResult,
  PaginatedResponse,
  AlumniAnalytics,
  UserEngagementMetrics,
  ALUMNI_PAGINATION,
  ALUMNI_CACHE_TTL,
} from '@/types/alumni';

interface AlumniStoreState {
  // Alumni Profiles
  profiles: AlumniProfile[];
  currentAlumniProfile: AlumniProfile | null;
  profilesLoading: boolean;
  profilesError: string | null;

  // Alumni Posts
  posts: AlumniPost[];
  currentPostsFeed: AlumniPost[];
  postsLoading: boolean;
  postsError: string | null;

  // Alumni Videos
  videos: AlumniVideo[];
  currentVideos: AlumniVideo[];
  videosLoading: boolean;
  videosError: string | null;

  // Bookmarks
  bookmarkedAlumni: Set<string>;
  
  // User Engagement
  userMetrics: UserEngagementMetrics;

  // Filters
  currentFilters: AlumniFilterParams;
  
  // Pagination
  profilesPage: number;
  postsPage: number;
  videosPage: number;

  // Search
  searchResults: AlumniSearchResult | null;
  isSearching: boolean;

  // Analytics (Admin)
  analytics: AlumniAnalytics | null;

  // Last cache update
  lastProfilesUpdate: number;
  lastPostsUpdate: number;
  lastVideosUpdate: number;

  // ========== Alumni Profile Actions ==========
  fetchAlumniProfiles: (collegeId: string, filters?: AlumniFilterParams) => Promise<void>;
  fetchAlumniById: (alumniId: string, collegeId: string) => Promise<void>;
  createAlumniProfile: (data: any, collegeId: string) => Promise<AlumniProfile>;
  updateAlumniProfile: (alumniId: string, data: any, collegeId: string) => Promise<void>;
  
  // ========== Alumni Posts Actions ==========
  fetchAlumniPosts: (collegeId: string, page?: number) => Promise<void>;
  createAlumniPost: (data: any, collegeId: string) => Promise<AlumniPost>;
  updateAlumniPost: (postId: string, data: any, collegeId: string) => Promise<void>;
  deleteAlumniPost: (postId: string, collegeId: string) => Promise<void>;
  likeAlumniPost: (postId: string, collegeId: string) => Promise<void>;
  unlikeAlumniPost: (postId: string, collegeId: string) => Promise<void>;
  
  // ========== Alumni Videos Actions ==========
  fetchAlumniVideos: (collegeId: string, filters?: any, page?: number) => Promise<void>;
  createAlumniVideo: (data: any, collegeId: string) => Promise<AlumniVideo>;
  updateAlumniVideo: (videoId: string, data: any, collegeId: string) => Promise<void>;
  likeAlumniVideo: (videoId: string, collegeId: string) => Promise<void>;
  unlikeAlumniVideo: (videoId: string, collegeId: string) => Promise<void>;
  recordVideoView: (videoId: string, duration: number, collegeId: string) => Promise<void>;
  
  // ========== Bookmarks Actions ==========
  bookmarkAlumni: (alumniId: string, collegeId: string) => Promise<void>;
  unbookmarkAlumni: (alumniId: string, collegeId: string) => Promise<void>;
  fetchBookmarks: (collegeId: string) => Promise<void>;
  isBookmarked: (alumniId: string) => boolean;
  
  // ========== Search & Filter Actions ==========
  searchAlumni: (query: string, collegeId: string, filters?: AlumniFilterParams) => Promise<void>;
  applyFilters: (filters: AlumniFilterParams, collegeId: string) => Promise<void>;
  clearFilters: () => void;
  
  // ========== Admin Actions ==========
  approveAlumniProfile: (alumniId: string, collegeId: string) => Promise<void>;
  rejectAlumniProfile: (alumniId: string, collegeId: string) => Promise<void>;
  approveAlumniPost: (postId: string, collegeId: string) => Promise<void>;
  rejectAlumniPost: (postId: string, collegeId: string) => Promise<void>;
  approveAlumniVideo: (videoId: string, collegeId: string) => Promise<void>;
  rejectAlumniVideo: (videoId: string, collegeId: string) => Promise<void>;
  fetchAnalytics: (collegeId: string) => Promise<void>;
  
  // ========== Utility Actions ==========
  clearCache: () => void;
  resetState: () => void;
}

const initialState = {
  profiles: [],
  currentAlumniProfile: null,
  profilesLoading: false,
  profilesError: null,
  posts: [],
  currentPostsFeed: [],
  postsLoading: false,
  postsError: null,
  videos: [],
  currentVideos: [],
  videosLoading: false,
  videosError: null,
  bookmarkedAlumni: new Set<string>(),
  userMetrics: {
    profilesViewed: 0,
    postsLiked: 0,
    videosWatched: 0,
    bookmarksCreated: 0,
    commentsLeft: 0,
  },
  currentFilters: {},
  profilesPage: 0,
  postsPage: 0,
  videosPage: 0,
  searchResults: null,
  isSearching: false,
  analytics: null,
  lastProfilesUpdate: 0,
  lastPostsUpdate: 0,
  lastVideosUpdate: 0,
};

export const useAlumniStore = create<AlumniStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========== Alumni Profile Actions ==========
      fetchAlumniProfiles: async (collegeId: string, filters?: AlumniFilterParams) => {
        try {
          const now = Date.now();
          const lastUpdate = get().lastProfilesUpdate;
          
          // Check cache
          if (now - lastUpdate < ALUMNI_CACHE_TTL.profiles && get().profiles.length > 0) {
            return;
          }

          set({ profilesLoading: true, profilesError: null });
          
          const queryParams = new URLSearchParams();
          queryParams.append('collegeId', collegeId);
          if (filters) {
            if (filters.searchQuery) queryParams.append('search', filters.searchQuery);
            if (filters.company && filters.company.length > 0) queryParams.append('company', filters.company.join(','));
            if (filters.department && filters.department.length > 0) queryParams.append('department', filters.department.join(','));
            if (filters.batch && filters.batch.length > 0) queryParams.append('batch', filters.batch.join(','));
            if (filters.skills && filters.skills.length > 0) queryParams.append('skills', filters.skills.join(','));
          }

          const response = await fetch(`/api/alumni?${queryParams.toString()}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });

          if (!response.ok) throw new Error('Failed to fetch alumni profiles');

          const data = await response.json();
          const profilesMapped = (data.data || []).map((p: any) => ({
            ...p,
            id: p.id || p._id
          }));
          set({
            profiles: profilesMapped,
            profilesLoading: false,
            lastProfilesUpdate: now,
          });
        } catch (error: any) {
          set({
            profilesLoading: false,
            profilesError: error.message || 'Failed to fetch profiles',
          });
        }
      },

      fetchAlumniById: async (alumniId: string, collegeId: string) => {
        try {
          set({ profilesLoading: true, profilesError: null });

          const response = await fetch(`/api/alumni/${alumniId}?collegeId=${collegeId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });

          if (!response.ok) throw new Error('Failed to fetch alumni profile');

          const data = await response.json();
          const profileWithId = data.data ? { ...data.data, id: data.data.id || data.data._id } : null;
          set({
            currentAlumniProfile: profileWithId,
            profilesLoading: false,
          });

          // Update metrics
          const metrics = get().userMetrics;
          set({
            userMetrics: {
              ...metrics,
              profilesViewed: metrics.profilesViewed + 1,
            }
          });
        } catch (error: any) {
          set({
            profilesLoading: false,
            profilesError: error.message || 'Failed to fetch profile',
          });
        }
      },

      createAlumniProfile: async (data: any, collegeId: string) => {
        try {
          set({ profilesLoading: true, profilesError: null });
          const authState = useAuthStore.getState();
          const userId = authState.uid;
          const email = authState.email;

          const response = await fetch('/api/alumni/profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ 
              ...data, 
              collegeId,
              userId,
              email,
              // Map key requested fields
              fullName: data.name,
              batchYear: data.batch,
              designation: data.role,
              careerJourney: data.story,
              profileImage: data.profileImageUrl
            }),
          });

          if (!response.ok) throw new Error('Failed to create alumni profile');

          const result = await response.json();
          const profileWithId = { ...result.data, id: result.data.id || result.data._id };
          set({ currentAlumniProfile: profileWithId, profilesLoading: false });
          
          // Mark profile as complete in auth store
          useAuthStore.getState().setProfileComplete(true);

          return profileWithId;
        } catch (error: any) {
          set({
            profilesLoading: false,
            profilesError: error.message || 'Failed to create profile',
          });
          throw error;
        }
      },

      updateAlumniProfile: async (alumniId: string, data: any, collegeId: string) => {
        try {
          set({ profilesLoading: true, profilesError: null });
          const authState = useAuthStore.getState();
          const userId = authState.uid;

          const response = await fetch('/api/alumni/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ 
              ...data, 
              alumniId,
              collegeId,
              userId,
              fullName: data.name,
              batchYear: data.batch,
              designation: data.role,
              careerJourney: data.story,
              profileImage: data.profileImageUrl
            }),
          });

          if (!response.ok) throw new Error('Failed to update alumni profile');

          const result = await response.json();
          const profileWithId = result.data ? { ...result.data, id: result.data.id || result.data._id } : null;
          set({ currentAlumniProfile: profileWithId, profilesLoading: false });
        } catch (error: any) {
          set({
            profilesLoading: false,
            profilesError: error.message || 'Failed to update profile',
          });
          throw error;
        }
      },

      // ========== Alumni Posts Actions ==========
      fetchAlumniPosts: async (collegeId: string, page = 0) => {
        try {
          const now = Date.now();
          const lastUpdate = get().lastPostsUpdate;

          if (now - lastUpdate < ALUMNI_CACHE_TTL.posts && get().posts.length > 0) {
            return;
          }

          set({ postsLoading: true, postsError: null });

          const offset = page * ALUMNI_PAGINATION.postsPerPage;
          const response = await fetch(
            `/api/alumni/posts?collegeId=${collegeId}&limit=${ALUMNI_PAGINATION.postsPerPage}&offset=${offset}`,
            {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }
          );

          if (!response.ok) throw new Error('Failed to fetch posts');

          const data = await response.json();
          set({
            currentPostsFeed: page === 0 ? data.data : [...get().currentPostsFeed, ...data.data],
            posts: page === 0 ? data.data : [...get().posts, ...data.data],
            postsLoading: false,
            lastPostsUpdate: now,
            postsPage: page,
          });
        } catch (error: any) {
          set({
            postsLoading: false,
            postsError: error.message || 'Failed to fetch posts',
          });
        }
      },

      createAlumniPost: async (data: any, collegeId: string) => {
        try {
          set({ postsLoading: true, postsError: null });

          const response = await fetch('/api/alumni/posts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ ...data, collegeId }),
          });

          if (!response.ok) throw new Error('Failed to create post');

          const result = await response.json();
          set({
            currentPostsFeed: [result.data, ...get().currentPostsFeed],
            postsLoading: false,
          });
          return result.data;
        } catch (error: any) {
          set({
            postsLoading: false,
            postsError: error.message || 'Failed to create post',
          });
          throw error;
        }
      },

      updateAlumniPost: async (postId: string, data: any, collegeId: string) => {
        try {
          set({ postsLoading: true, postsError: null });

          const response = await fetch(`/api/alumni/posts/${postId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ ...data, collegeId }),
          });

          if (!response.ok) throw new Error('Failed to update post');

          const result = await response.json();
          const posts = get().currentPostsFeed.map(p => p.id === postId ? result.data : p);
          set({ currentPostsFeed: posts, postsLoading: false });
        } catch (error: any) {
          set({
            postsLoading: false,
            postsError: error.message || 'Failed to update post',
          });
        }
      },

      deleteAlumniPost: async (postId: string, collegeId: string) => {
        try {
          const response = await fetch(`/api/alumni/posts/${postId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-College-Id': collegeId,
            },
          });

          if (!response.ok) throw new Error('Failed to delete post');

          const posts = get().currentPostsFeed.filter(p => p.id !== postId);
          set({ currentPostsFeed: posts });
        } catch (error) {
          throw error;
        }
      },

      likeAlumniPost: async (postId: string, collegeId: string) => {
        try {
          const response = await fetch(`/api/alumni/posts/${postId}/like`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-College-Id': collegeId,
            },
          });

          if (!response.ok) throw new Error('Failed to like post');

          const posts = get().currentPostsFeed.map(p =>
            p.id === postId
              ? { ...p, likeCount: p.likeCount + 1, currentUserLiked: true }
              : p
          );
          set({
            currentPostsFeed: posts,
            userMetrics: { ...get().userMetrics, postsLiked: get().userMetrics.postsLiked + 1 }
          });
        } catch (error) {
          throw error;
        }
      },

      unlikeAlumniPost: async (postId: string, collegeId: string) => {
        try {
          const response = await fetch(`/api/alumni/posts/${postId}/unlike`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-College-Id': collegeId,
            },
          });

          if (!response.ok) throw new Error('Failed to unlike post');

          const posts = get().currentPostsFeed.map(p =>
            p.id === postId
              ? { ...p, likeCount: Math.max(0, p.likeCount - 1), currentUserLiked: false }
              : p
          );
          set({ currentPostsFeed: posts });
        } catch (error) {
          throw error;
        }
      },

      // ========== Alumni Videos Actions ==========
      fetchAlumniVideos: async (collegeId: string, filters?: any, page = 0) => {
        try {
          const now = Date.now();
          const lastUpdate = get().lastVideosUpdate;

          if (now - lastUpdate < ALUMNI_CACHE_TTL.videos && get().videos.length > 0) {
            return;
          }

          set({ videosLoading: true, videosError: null });

          const offset = page * ALUMNI_PAGINATION.videosPerPage;
          const params = new URLSearchParams({
            collegeId,
            limit: ALUMNI_PAGINATION.videosPerPage.toString(),
            offset: offset.toString(),
            ...filters,
          });

          const response = await fetch(`/api/alumni/videos?${params}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });

          if (!response.ok) throw new Error('Failed to fetch videos');

          const data = await response.json();
          set({
            currentVideos: page === 0 ? data.data : [...get().currentVideos, ...data.data],
            videos: page === 0 ? data.data : [...get().videos, ...data.data],
            videosLoading: false,
            lastVideosUpdate: now,
            videosPage: page,
          });
        } catch (error: any) {
          set({
            videosLoading: false,
            videosError: error.message || 'Failed to fetch videos',
          });
        }
      },

      createAlumniVideo: async (data: any, collegeId: string) => {
        try {
          set({ videosLoading: true, videosError: null });

          const response = await fetch('/api/alumni/videos/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ ...data, collegeId }),
          });

          if (!response.ok) throw new Error('Failed to create video');

          const result = await response.json();
          set({ videosLoading: false });
          return result.data;
        } catch (error: any) {
          set({
            videosLoading: false,
            videosError: error.message || 'Failed to create video',
          });
          throw error;
        }
      },

      updateAlumniVideo: async (videoId: string, data: any, collegeId: string) => {
        try {
          const response = await fetch(`/api/alumni/videos/${videoId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ ...data, collegeId }),
          });

          if (!response.ok) throw new Error('Failed to update video');

          const result = await response.json();
          const videos = get().currentVideos.map(v => v.id === videoId ? result.data : v);
          set({ currentVideos: videos });
        } catch (error) {
          throw error;
        }
      },

      likeAlumniVideo: async (videoId: string, collegeId: string) => {
        try {
          const response = await fetch(`/api/alumni/videos/${videoId}/like`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-College-Id': collegeId,
            },
          });

          if (!response.ok) throw new Error('Failed to like video');

          const videos = get().currentVideos.map(v =>
            v.id === videoId
              ? { ...v, likeCount: v.likeCount + 1, currentUserLiked: true }
              : v
          );
          set({ currentVideos: videos });
        } catch (error) {
          throw error;
        }
      },

      unlikeAlumniVideo: async (videoId: string, collegeId: string) => {
        try {
          const response = await fetch(`/api/alumni/videos/${videoId}/unlike`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-College-Id': collegeId,
            },
          });

          if (!response.ok) throw new Error('Failed to unlike video');

          const videos = get().currentVideos.map(v =>
            v.id === videoId
              ? { ...v, likeCount: Math.max(0, v.likeCount - 1), currentUserLiked: false }
              : v
          );
          set({ currentVideos: videos });
        } catch (error) {
          throw error;
        }
      },

      recordVideoView: async (videoId: string, duration: number, collegeId: string) => {
        try {
          await fetch(`/api/alumni/videos/${videoId}/view`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ duration, collegeId }),
          });

          set({
            userMetrics: {
              ...get().userMetrics,
              videosWatched: get().userMetrics.videosWatched + 1,
            }
          });
        } catch (error) {
          console.error('Failed to record video view:', error);
        }
      },

      // ========== Bookmarks Actions ==========
      bookmarkAlumni: async (alumniId: string, collegeId: string) => {
        try {
          const response = await fetch('/api/alumni/bookmarks/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ alumniId, collegeId }),
          });

          if (!response.ok) throw new Error('Failed to bookmark');

          const bookmarks = new Set(get().bookmarkedAlumni);
          bookmarks.add(alumniId);
          set({
            bookmarkedAlumni: bookmarks,
            userMetrics: {
              ...get().userMetrics,
              bookmarksCreated: get().userMetrics.bookmarksCreated + 1,
            }
          });
        } catch (error) {
          throw error;
        }
      },

      unbookmarkAlumni: async (alumniId: string, collegeId: string) => {
        try {
          const response = await fetch(`/api/alumni/bookmarks/${alumniId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-College-Id': collegeId,
            },
          });

          if (!response.ok) throw new Error('Failed to unbookmark');

          const bookmarks = new Set(get().bookmarkedAlumni);
          bookmarks.delete(alumniId);
          set({ bookmarkedAlumni: bookmarks });
        } catch (error) {
          throw error;
        }
      },

      fetchBookmarks: async (collegeId: string) => {
        try {
          const response = await fetch(`/api/alumni/bookmarks?collegeId=${collegeId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });

          if (!response.ok) throw new Error('Failed to fetch bookmarks');

          const data = await response.json();
          const bookmarks = new Set(data.data.map((b: any) => b.alumniId));
          set({ bookmarkedAlumni: bookmarks });
        } catch (error) {
          console.error('Failed to fetch bookmarks:', error);
        }
      },

      isBookmarked: (alumniId: string) => {
        return get().bookmarkedAlumni.has(alumniId);
      },

      // ========== Search & Filter Actions ==========
      searchAlumni: async (query: string, collegeId: string, filters?: AlumniFilterParams) => {
        try {
          set({ isSearching: true, profilesLoading: true });

          const queryParams = new URLSearchParams({
            search: query,
            collegeId,
          });
          if (filters) {
            if (filters.company && filters.company.length > 0) queryParams.append('company', filters.company.join(','));
            if (filters.department && filters.department.length > 0) queryParams.append('department', filters.department.join(','));
            if (filters.batch && filters.batch.length > 0) queryParams.append('batch', filters.batch.join(','));
          }

          const response = await fetch(`/api/alumni?${queryParams.toString()}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });

          if (!response.ok) throw new Error('Failed to search alumni');

          const data = await response.json();
          const profilesMapped = (data.data || []).map((p: any) => ({
            ...p,
            id: p.id || p._id
          }));
          set({
            profiles: profilesMapped,
            searchResults: { profiles: profilesMapped, total: profilesMapped.length, hasMore: false },
            isSearching: false,
            profilesLoading: false
          });
        } catch (error) {
          set({ isSearching: false, profilesLoading: false });
          throw error;
        }
      },

      applyFilters: async (filters: AlumniFilterParams, collegeId: string) => {
        try {
          set({ profilesLoading: true, currentFilters: filters });
          await get().fetchAlumniProfiles(collegeId, filters);
        } catch (error) {
          set({ profilesLoading: false });
          throw error;
        }
      },

      clearFilters: () => {
        set({ currentFilters: {}, profilesPage: 0 });
      },

      // ========== Admin Actions ==========
      approveAlumniProfile: async (alumniId: string, collegeId: string) => {
        try {
          const response = await fetch(`/api/alumni/${alumniId}/approve`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-College-Id': collegeId,
            },
          });

          if (!response.ok) throw new Error('Failed to approve profile');

          if (get().currentAlumniProfile?.id === alumniId) {
            set({
              currentAlumniProfile: {
                ...get().currentAlumniProfile!,
                approvalStatus: 'approved'
              }
            });
          }
        } catch (error) {
          throw error;
        }
      },

      rejectAlumniProfile: async (alumniId: string, collegeId: string) => {
        try {
          const response = await fetch(`/api/alumni/${alumniId}/reject`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-College-Id': collegeId,
            },
          });

          if (!response.ok) throw new Error('Failed to reject profile');

          if (get().currentAlumniProfile?.id === alumniId) {
            set({
              currentAlumniProfile: {
                ...get().currentAlumniProfile!,
                approvalStatus: 'rejected'
              }
            });
          }
        } catch (error) {
          throw error;
        }
      },

      approveAlumniPost: async (postId: string, collegeId: string) => {
        try {
          await fetch(`/api/alumni/posts/${postId}/approve`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-College-Id': collegeId,
            },
          });
        } catch (error) {
          throw error;
        }
      },

      rejectAlumniPost: async (postId: string, collegeId: string) => {
        try {
          await fetch(`/api/alumni/posts/${postId}/reject`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-College-Id': collegeId,
            },
          });
        } catch (error) {
          throw error;
        }
      },

      approveAlumniVideo: async (videoId: string, collegeId: string) => {
        try {
          await fetch(`/api/alumni/videos/${videoId}/approve`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-College-Id': collegeId,
            },
          });
        } catch (error) {
          throw error;
        }
      },

      rejectAlumniVideo: async (videoId: string, collegeId: string) => {
        try {
          await fetch(`/api/alumni/videos/${videoId}/reject`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-College-Id': collegeId,
            },
          });
        } catch (error) {
          throw error;
        }
      },

      fetchAnalytics: async (collegeId: string) => {
        try {
          const response = await fetch(`/api/alumni/analytics?collegeId=${collegeId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });

          if (!response.ok) throw new Error('Failed to fetch analytics');

          const data = await response.json();
          set({ analytics: data.data });
        } catch (error) {
          console.error('Failed to fetch analytics:', error);
        }
      },

      // ========== Utility Actions ==========
      clearCache: () => {
        set({
          lastProfilesUpdate: 0,
          lastPostsUpdate: 0,
          lastVideosUpdate: 0,
        });
      },

      resetState: () => {
        set(initialState);
      },
    }),
    {
      name: 'alumni-store',
      partialize: (state) => ({
        bookmarkedAlumni: Array.from(state.bookmarkedAlumni),
        userMetrics: state.userMetrics,
      }),
    }
  )
);

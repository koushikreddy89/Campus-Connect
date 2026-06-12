/**
 * Alumni Social Store - Zustand
 * Manages alumni discovery, following system, and social feed
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AlumniCard,
  AlumniProfile,
  SocialPost,
  FeedResponse,
  DiscoveryResponse,
  TopAlumniResponse,
} from '@/types/social';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface SocialStoreState {
  // Discovery
  discoveryAlumni: AlumniCard[];
  discoveryLoading: boolean;
  discoveryError: string | null;
  discoveryPage: number;

  // Following List
  following: AlumniProfile[];
  followingLoading: boolean;
  followingError: string | null;

  // Followers List
  followers: AlumniProfile[];
  followersLoading: boolean;
  followersError: string | null;

  // Social Feed
  feedPosts: SocialPost[];
  feedLoading: boolean;
  feedError: string | null;
  feedPage: number;

  // Top Alumni
  topAlumni: AlumniProfile[];
  topAlumniLoading: boolean;
  topAlumniError: string | null;

  // Current Alumni Profile
  currentProfile: AlumniProfile | null;
  currentProfileLoading: boolean;
  currentProfileError: string | null;

  // Following state
  following_set: Set<string>; // Set of followed alumni IDs

  // ========== Discovery Actions ==========
  fetchDiscoveryAlumni: (page?: number, limit?: number, college?: string) => Promise<void>;
  skipAlumni: (alumniId: string) => void;
  resetDiscovery: () => void;

  // ========== Following Actions ==========
  followAlumni: (alumniId: string) => Promise<void>;
  unfollowAlumni: (alumniId: string) => Promise<void>;
  fetchFollowing: (userId: string, page?: number, limit?: number) => Promise<void>;
  fetchFollowers: (userId: string, page?: number, limit?: number) => Promise<void>;
  isFollowing: (alumniId: string) => boolean;

  // ========== Feed Actions ==========
  fetchSocialFeed: (page?: number, limit?: number, type?: string) => Promise<void>;
  loadMoreFeed: () => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;

  // ========== Profile Actions ==========
  fetchAlumniProfile: (alumniId: string) => Promise<void>;
  fetchTopAlumni: (limit?: number, college?: string) => Promise<void>;

  // ========== Utility Actions ==========
  clearFeed: () => void;
  resetState: () => void;
}

const initialState = {
  discoveryAlumni: [],
  discoveryLoading: false,
  discoveryError: null,
  discoveryPage: 1,
  following: [],
  followingLoading: false,
  followingError: null,
  followers: [],
  followersLoading: false,
  followersError: null,
  feedPosts: [],
  feedLoading: false,
  feedError: null,
  feedPage: 1,
  topAlumni: [],
  topAlumniLoading: false,
  topAlumniError: null,
  currentProfile: null,
  currentProfileLoading: false,
  currentProfileError: null,
  following_set: new Set<string>(),
};

export const useSocialStore = create<SocialStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========== Discovery Actions ==========
      fetchDiscoveryAlumni: async (page = 1, limit = 10, college?: string) => {
        set({ discoveryLoading: true, discoveryError: null });
        try {
          const params = new URLSearchParams({
            page: String(page),
            limit: String(limit),
          });
          if (college) params.append('college', college);

          const response = await axios.get<DiscoveryResponse>(
            `${API_URL}/alumni/discover?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              },
            }
          );

          set({
            discoveryAlumni: response.data.data.alumni,
            discoveryPage: page,
            discoveryLoading: false,
          });
        } catch (error: any) {
          set({
            discoveryError: error.response?.data?.message || 'Failed to fetch alumni',
            discoveryLoading: false,
          });
        }
      },

      skipAlumni: (alumniId: string) => {
        set((state) => ({
          discoveryAlumni: state.discoveryAlumni.filter((a) => a._id !== alumniId),
        }));
      },

      resetDiscovery: () => {
        set({ discoveryAlumni: [], discoveryPage: 1 });
      },

      // ========== Following Actions ==========
      followAlumni: async (alumniId: string) => {
        try {
          await axios.post(
            `${API_URL}/alumni/${alumniId}/follow`,
            {},
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              },
            }
          );

          // Update following set
          set((state) => {
            const newSet = new Set(state.following_set);
            newSet.add(alumniId);
            return { following_set: newSet };
          });

          // Remove from discovery
          set((state) => ({
            discoveryAlumni: state.discoveryAlumni.filter((a) => a._id !== alumniId),
          }));
        } catch (error: any) {
          console.error('Failed to follow alumni:', error);
          throw error;
        }
      },

      unfollowAlumni: async (alumniId: string) => {
        try {
          await axios.delete(`${API_URL}/alumni/${alumniId}/unfollow`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          // Update following set
          set((state) => {
            const newSet = new Set(state.following_set);
            newSet.delete(alumniId);
            return { following_set: newSet };
          });
        } catch (error: any) {
          console.error('Failed to unfollow alumni:', error);
          throw error;
        }
      },

      fetchFollowing: async (userId: string, page = 1, limit = 20) => {
        set({ followingLoading: true, followingError: null });
        try {
          const response = await axios.get(
            `${API_URL}/alumni/${userId}/following?page=${page}&limit=${limit}`
          );

          set({
            following: response.data.data.following,
            followingLoading: false,
          });
        } catch (error: any) {
          set({
            followingError: error.response?.data?.message || 'Failed to fetch following list',
            followingLoading: false,
          });
        }
      },

      fetchFollowers: async (userId: string, page = 1, limit = 20) => {
        set({ followersLoading: true, followersError: null });
        try {
          const response = await axios.get(
            `${API_URL}/alumni/${userId}/followers?page=${page}&limit=${limit}`
          );

          set({
            followers: response.data.data.followers,
            followersLoading: false,
          });
        } catch (error: any) {
          set({
            followersError: error.response?.data?.message || 'Failed to fetch followers list',
            followersLoading: false,
          });
        }
      },

      isFollowing: (alumniId: string) => {
        return get().following_set.has(alumniId);
      },

      // ========== Feed Actions ==========
      fetchSocialFeed: async (page = 1, limit = 20, type?: string) => {
        set({ feedLoading: true, feedError: null });
        try {
          const params = new URLSearchParams({
            page: String(page),
            limit: String(limit),
          });
          if (type) params.append('type', type);

          const response = await axios.get<FeedResponse>(
            `${API_URL}/social/feed?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              },
            }
          );

          if (page === 1) {
            set({
              feedPosts: response.data.data.posts,
              feedPage: page,
              feedLoading: false,
            });
          } else {
            set((state) => ({
              feedPosts: [...state.feedPosts, ...response.data.data.posts],
              feedPage: page,
              feedLoading: false,
            }));
          }
        } catch (error: any) {
          set({
            feedError: error.response?.data?.message || 'Failed to fetch feed',
            feedLoading: false,
          });
        }
      },

      loadMoreFeed: async () => {
        const currentPage = get().feedPage;
        await get().fetchSocialFeed(currentPage + 1);
      },

      likePost: async (postId: string) => {
        try {
          await axios.post(
            `${API_URL}/posts/${postId}/like`,
            {},
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              },
            }
          );

          // Update post in feed
          set((state) => ({
            feedPosts: state.feedPosts.map((post) =>
              post._id === postId
                ? { ...post, isLiked: true, likeCount: post.likeCount + 1 }
                : post
            ),
          }));
        } catch (error: any) {
          console.error('Failed to like post:', error);
        }
      },

      unlikePost: async (postId: string) => {
        try {
          await axios.post(
            `${API_URL}/posts/${postId}/like`,
            {},
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              },
            }
          );

          // Update post in feed
          set((state) => ({
            feedPosts: state.feedPosts.map((post) =>
              post._id === postId
                ? { ...post, isLiked: false, likeCount: post.likeCount - 1 }
                : post
            ),
          }));
        } catch (error: any) {
          console.error('Failed to unlike post:', error);
        }
      },

      addComment: async (postId: string, text: string) => {
        try {
          await axios.post(
            `${API_URL}/posts/${postId}/comments`,
            { text },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              },
            }
          );

          // Refetch post to update comments
          const updatedPost = await axios.get(`${API_URL}/posts/${postId}`);
          set((state) => ({
            feedPosts: state.feedPosts.map((post) =>
              post._id === postId ? updatedPost.data.data : post
            ),
          }));
        } catch (error: any) {
          console.error('Failed to add comment:', error);
        }
      },

      // ========== Profile Actions ==========
      fetchAlumniProfile: async (alumniId: string) => {
        set({ currentProfileLoading: true, currentProfileError: null });
        try {
          const response = await axios.get(`${API_URL}/alumni/${alumniId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          set({
            currentProfile: response.data.data.profile,
            currentProfileLoading: false,
          });
        } catch (error: any) {
          set({
            currentProfileError: error.response?.data?.message || 'Failed to fetch profile',
            currentProfileLoading: false,
          });
        }
      },

      fetchTopAlumni: async (limit = 10, college?: string) => {
        set({ topAlumniLoading: true, topAlumniError: null });
        try {
          const params = new URLSearchParams({ limit: String(limit) });
          if (college) params.append('college', college);

          const response = await axios.get<TopAlumniResponse>(
            `${API_URL}/alumni/top?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              },
            }
          );

          set({
            topAlumni: response.data.data.alumni,
            topAlumniLoading: false,
          });
        } catch (error: any) {
          set({
            topAlumniError: error.response?.data?.message || 'Failed to fetch top alumni',
            topAlumniLoading: false,
          });
        }
      },

      // ========== Utility Actions ==========
      clearFeed: () => {
        set({ feedPosts: [], feedPage: 1 });
      },

      resetState: () => {
        set(initialState);
      },
    }),
    {
      name: 'social-store',
      version: 1,
    }
  )
);

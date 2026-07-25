import { create } from 'zustand';
import { Post, PostCategory, Comment, ReactionEmoji } from '@/types';
import { getCurrentUserEmail } from '@/utils/userUtils';
import { feedApi } from '@/services/api';
import { toast } from 'sonner';

interface FeedState {
  posts: Post[];
  isLoading: boolean;
  page: number;
  hasMore: boolean;
  savedPosts: Set<string>;
  currentUserEmail: string;
  fetchPosts: (category?: string) => Promise<void>;
  loadMore: () => void;
  toggleLike: (postId: string) => Promise<void>;
  toggleSave: (postId: string) => void;
  addComment: (postId: string, content: string) => Promise<void>;
  createPost: (content: string, isAnonymous: boolean, image?: string, category?: PostCategory) => Promise<void>;
  reactToPost: (postId: string, emoji: ReactionEmoji) => Promise<void>;
  incrementView: (postId: string) => void;
  initializePosts: (posts: Post[], userEmail: string) => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  isLoading: false,
  page: 1,
  hasMore: true,
  savedPosts: new Set<string>(),
  currentUserEmail: getCurrentUserEmail() || 'user@example.com',

  fetchPosts: async (category = 'all') => {
    set({ isLoading: true });
    try {
      const data = await feedApi.getPosts(category);
      set({ posts: data, isLoading: false, hasMore: false });
    } catch (err) {
      console.error('Error in fetchPosts:', err);
      set({ isLoading: false });
    }
  },

  loadMore: () => {
    // Basic stub, fetchPosts handles the loading
  },

  toggleLike: async (postId: string) => {
    try {
      const res = await feedApi.likePost(postId);
      if (res && res.success) {
        set((s) => ({
          posts: s.posts.map(p => {
            if (p.id === postId) {
              const isLikedNow = res.liked;
              return {
                ...p,
                isLiked: isLikedNow,
                likes: isLikedNow ? p.likes + 1 : Math.max(0, p.likes - 1)
              };
            }
            return p;
          })
        }));
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  },

  toggleSave: (postId: string) => {
    set((s) => {
      const newSaved = new Set(s.savedPosts);
      if (newSaved.has(postId)) newSaved.delete(postId);
      else newSaved.add(postId);
      return { savedPosts: newSaved };
    });
  },

  addComment: async (postId: string, content: string) => {
    try {
      const res = await feedApi.addComment(postId, content);
      if (res && res.success) {
        const comment = res.data;
        set((s) => ({
          posts: s.posts.map(p => {
            if (p.id === postId) {
              const mappedComment: Comment = {
                id: comment._id || comment.id,
                authorId: comment.userId,
                authorName: comment.userName || 'You',
                content: comment.content,
                createdAt: comment.createdAt || new Date().toISOString()
              };
              return { ...p, comments: [...p.comments, mappedComment] };
            }
            return p;
          })
        }));
        toast.success('Comment added!');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  },

  createPost: async (content: string, isAnonymous: boolean, image?: string, category: PostCategory = 'general') => {
    try {
      set({ isLoading: true });
      const res = await feedApi.createPost(content, isAnonymous, category, image);
      if (res && res.success) {
        toast.success(res.message || 'Post published successfully!');
        const newPost = res.data;
        if (newPost) {
          set((s) => {
            const exists = s.posts.some(p => p.id === (newPost.id || newPost._id));
            if (exists) return { isLoading: false };
            const formattedPost: Post = {
              id: newPost.id || newPost._id,
              authorId: newPost.userId || 'me',
              authorName: isAnonymous ? 'Anonymous Student' : (newPost.authorName || 'You'),
              authorAvatar: isAnonymous ? `https://api.dicebear.com/7.x/avataaars/svg?seed=anon-${newPost.id || newPost._id}` : (newPost.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newPost.userId}`),
              isAnonymous,
              content: newPost.content || content,
              category: newPost.category || category,
              likes: 0,
              comments: [],
              reactions: { '❤️': [], '🔥': [], '😂': [], '👀': [], '👍': [] },
              createdAt: newPost.createdAt || new Date().toISOString(),
              image: newPost.image || image,
              videoUrl: newPost.videoUrl
            };
            return {
              posts: [formattedPost, ...s.posts],
              isLoading: false
            };
          });
        } else {
          const data = await feedApi.getPosts('all');
          set({ posts: data, isLoading: false });
        }
      } else {
        toast.error(res?.error || 'Failed to create post');
        set({ isLoading: false });
      }
    } catch (err: any) {
      console.error('Error creating post:', err);
      toast.error(err.message || 'Failed to create post');
      set({ isLoading: false });
    }
  },

  reactToPost: async (postId: string, emoji: ReactionEmoji) => {
    await get().toggleLike(postId);
  },

  incrementView: (postId: string) => {
    set((s) => ({
      posts: s.posts.map(p =>
        p.id === postId ? { ...p, viewCount: (p.viewCount || 0) + 1 } : p
      ),
    }));
  },

  initializePosts: (posts: Post[], userEmail: string) => {
    set({ posts, currentUserEmail: userEmail });
  },
}));

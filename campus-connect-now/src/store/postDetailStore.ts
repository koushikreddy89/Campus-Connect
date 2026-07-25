import { create } from 'zustand';
import { getApiUrl } from '@/services/connectionService';
import { useAuthStore } from './authStore';
import { toast } from 'sonner';

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

interface PostDetail {
  id: string;
  userId?: string;
  alumniId?: string;
  authorName: string;
  authorAvatar: string;
  author?: any;
  content: string;
  isAnonymous?: boolean;
  image?: string;
  images?: string[];
  imageUrls?: string[];
  videoUrl?: string;
  videos?: string[];
  videoUrls?: string[];
  category?: string;
  type?: string;
  likes: number;
  isLiked: boolean;
  comments: Comment[];
  reactions: Record<string, string[]>;
  createdAt: string;
  company?: string;
  jobRole?: string;
  applyLink?: string;
}

interface PostDetailState {
  activePostId: string | null;
  isOpen: boolean;
  post: PostDetail | null;
  isLoading: boolean;
  openPost: (postId: string) => Promise<void>;
  closePost: () => void;
  toggleLikeActivePost: () => Promise<void>;
  addCommentToActivePost: (content: string) => Promise<void>;
  deleteCommentFromActivePost: (commentId: string) => Promise<void>;
  refreshActivePost: () => Promise<void>;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token') || '';
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const usePostDetailStore = create<PostDetailState>((set, get) => ({
  activePostId: null,
  isOpen: false,
  post: null,
  isLoading: false,

  openPost: async (postId: string) => {
    set({ activePostId: postId, isOpen: true, isLoading: true, post: null });
    try {
      const res = await fetch(`${getApiUrl()}/api/posts/${postId}`, {
        headers: getAuthHeaders()
      });
      const result = await res.json();
      if (result.success && result.data) {
        set({ post: result.data, isLoading: false });
      } else {
        toast.error(result.error || 'Failed to load post details');
        set({ isLoading: false });
      }
    } catch (error: any) {
      console.error('Error fetching post details:', error);
      toast.error('Error fetching post details');
      set({ isLoading: false });
    }
  },

  closePost: () => {
    set({ activePostId: null, isOpen: false, post: null, isLoading: false });
  },

  toggleLikeActivePost: async () => {
    const { post } = get();
    if (!post) return;

    // Optimistic Update
    const originallyLiked = post.isLiked;
    const originalLikesCount = post.likes;
    const originallyLikedList = post.reactions?.['❤️'] || [];
    const myId = useAuthStore.getState().uid || 'me';

    const updatedLikesCount = originallyLiked ? Math.max(0, originalLikesCount - 1) : originalLikesCount + 1;
    const updatedLikedList = originallyLiked 
      ? originallyLikedList.filter(id => id !== myId)
      : [...originallyLikedList, myId];

    set({
      post: {
        ...post,
        isLiked: !originallyLiked,
        likes: updatedLikesCount,
        reactions: {
          ...post.reactions,
          '❤️': updatedLikedList
        }
      }
    });

    try {
      const res = await fetch(`${getApiUrl()}/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: myId })
      });
      const result = await res.json();
      if (!result.success) {
        // Rollback on failure
        set({
          post: {
            ...post,
            isLiked: originallyLiked,
            likes: originalLikesCount,
            reactions: {
              ...post.reactions,
              '❤️': originallyLikedList
            }
          }
        });
        toast.error(result.error || 'Failed to toggle like');
      }
    } catch (error) {
      console.error('Error liking post:', error);
      // Rollback
      set({
        post: {
          ...post,
          isLiked: originallyLiked,
          likes: originalLikesCount,
          reactions: {
            ...post.reactions,
            '❤️': originallyLikedList
          }
        }
      });
    }
  },

  addCommentToActivePost: async (content: string) => {
    const { post } = get();
    if (!post) return;

    try {
      const myId = useAuthStore.getState().uid || 'me';
      const res = await fetch(`${getApiUrl()}/api/posts/${post.id}/comment`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: myId, content })
      });
      const result = await res.json();
      if (result.success && result.data) {
        toast.success('Comment added!');
        const commentData = result.data;
        const newComment: Comment = {
          id: commentData._id || commentData.id,
          authorId: commentData.userId,
          authorName: commentData.userName || 'You',
          authorAvatar: commentData.userAvatar || '',
          content: commentData.content,
          createdAt: commentData.createdAt || new Date().toISOString()
        };

        set({
          post: {
            ...post,
            comments: [...post.comments, newComment]
          }
        });
      } else {
        toast.error(result.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  },

  deleteCommentFromActivePost: async (commentId: string) => {
    const { post } = get();
    if (!post) return;

    try {
      const res = await fetch(`${getApiUrl()}/api/posts/${post.id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Comment deleted!');
        set({
          post: {
            ...post,
            comments: post.comments.filter(c => c.id !== commentId)
          }
        });
      } else {
        // Optimistic delete or refresh
        set({
          post: {
            ...post,
            comments: post.comments.filter(c => c.id !== commentId)
          }
        });
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      // Fallback optimistic delete anyway for UI responsiveness
      set({
        post: {
          ...post,
          comments: post.comments.filter(c => c.id !== commentId)
        }
      });
    }
  },

  refreshActivePost: async () => {
    const { activePostId } = get();
    if (!activePostId) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/posts/${activePostId}`, {
        headers: getAuthHeaders()
      });
      const result = await res.json();
      if (result.success && result.data) {
        set({ post: result.data });
      }
    } catch (error) {
      console.error('Error refreshing post:', error);
    }
  }
}));

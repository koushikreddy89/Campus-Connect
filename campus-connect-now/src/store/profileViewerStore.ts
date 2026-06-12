import { create } from 'zustand';
import { profileViewApi } from '@/services/api';

export interface ProfileViewer {
  _id: string;
  viewerId: {
    _id: string;
    name: string;
    profilePic?: string;
    email: string;
    college?: string;
  };
  timestamp: string;
  createdAt: string;
}

interface ProfileViewerState {
  viewers: ProfileViewer[];
  isLoading: boolean;
  error: string | null;
  fetchViewers: (limit?: number) => Promise<void>;
  clearError: () => void;
}

export const useProfileViewerStore = create<ProfileViewerState>((set) => ({
  viewers: [],
  isLoading: false,
  error: null,

  fetchViewers: async (limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const response = await profileViewApi.getMyViewers(limit);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch viewers');
      }

      const viewers = response.data?.viewers || [];
      set({ viewers, isLoading: false });
      console.log('[ProfileViewerStore] Fetched viewers:', viewers.length);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile viewers';
      console.error('[ProfileViewerStore] Error:', errorMessage);
      set({ isLoading: false, error: errorMessage, viewers: [] });
    }
  },

  clearError: () => set({ error: null }),
}));

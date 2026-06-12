import { create } from 'zustand';
import { Story } from '@/types';
import { getCurrentUserEmail } from '@/utils/userUtils';
import { storyApi } from '@/services/api';
import { useAuthStore } from './authStore';
import { getApiUrl } from '@/services/connectionService';

interface StoryState {
  stories: Story[];
  activeStoryIndex: number | null;
  currentUserEmail: string;
  fetchStories: () => Promise<void>;
  viewStory: (index: number) => Promise<void>;
  closeStory: () => void;
  nextStory: () => void;
  prevStory: () => void;
  addStory: (image: string, caption?: string) => Promise<void>;
  addTextStory: (text: string, bgColor: string) => Promise<void>;
  getViewers: (storyId: string) => string[];
  initializeStories: (stories: Story[], userEmail: string) => void;
}

const TEXT_STORY_PLACEHOLDER = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';

export const useStoryStore = create<StoryState>((set, get) => ({
  stories: [],
  activeStoryIndex: null,
  currentUserEmail: getCurrentUserEmail() || 'user@example.com',

  fetchStories: async () => {
    try {
      const res = await storyApi.getStories();
      if (res && res.success) {
        const mapped = (res.data || []).map((s: any) => ({
          ...s,
          id: s._id || s.id
        }));
        set({ stories: mapped });
      }
    } catch (e) {
      console.error('Error fetching stories in store:', e);
    }
  },

  viewStory: async (index: number) => {
    const { stories, currentUserEmail } = get();
    if (index >= 0 && index < stories.length) {
      const targetStory = stories[index];
      try {
        await storyApi.viewStory(targetStory.id);
        const updated = [...stories];
        const viewers = [...(updated[index].viewers || [])];
        const myUid = useAuthStore.getState().uid || currentUserEmail;
        if (!viewers.includes(myUid)) viewers.push(myUid);
        updated[index] = { ...updated[index], viewed: true, viewers };
        set({ stories: updated, activeStoryIndex: index });
      } catch (e) {
        console.error('Error viewing story:', e);
      }
    }
  },

  closeStory: () => set({ activeStoryIndex: null }),

  nextStory: () => {
    const { activeStoryIndex, stories, currentUserEmail } = get();
    if (activeStoryIndex !== null && activeStoryIndex < stories.length - 1) {
      const next = activeStoryIndex + 1;
      const targetStory = stories[next];
      storyApi.viewStory(targetStory.id).catch(err => console.error(err));
      
      const updated = [...stories];
      const viewers = [...(updated[next].viewers || [])];
      const myUid = useAuthStore.getState().uid || currentUserEmail;
      if (!viewers.includes(myUid)) viewers.push(myUid);
      updated[next] = { ...updated[next], viewed: true, viewers };
      set({ stories: updated, activeStoryIndex: next });
    } else {
      set({ activeStoryIndex: null });
    }
  },

  prevStory: () => {
    const { activeStoryIndex } = get();
    if (activeStoryIndex !== null && activeStoryIndex > 0) {
      set({ activeStoryIndex: activeStoryIndex - 1 });
    }
  },

  addStory: async (image: string, caption?: string) => {
    try {
      const res = await storyApi.createStory(image, caption);
      if (res && res.success && res.data) {
        const mapped = { ...res.data, id: res.data._id || res.data.id };
        const current = get().stories;
        set({ stories: [mapped, ...current] });
      }
    } catch (e) {
      console.error('Error adding story in store:', e);
    }
  },

  addTextStory: async (text: string, bgColor: string) => {
    try {
      const userId = useAuthStore.getState().uid || get().currentUserEmail;
      const res = await fetch(`${getApiUrl()}/api/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          image: TEXT_STORY_PLACEHOLDER,
          type: 'text',
          textContent: text,
          bgColor
        })
      });
      const result = await res.json();
      if (result && result.success && result.data) {
        const mapped = { ...result.data, id: result.data._id || result.data.id };
        const current = get().stories;
        set({ stories: [mapped, ...current] });
      }
    } catch (e) {
      console.error('Error adding text story in store:', e);
    }
  },

  getViewers: (storyId: string) => {
    const story = get().stories.find(s => s.id === storyId);
    return story?.viewers || [];
  },

  initializeStories: (stories: Story[], userEmail: string) => {
    set({ stories, currentUserEmail: userEmail });
  },
}));

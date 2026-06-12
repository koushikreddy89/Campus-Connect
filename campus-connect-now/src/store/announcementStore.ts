import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { getApiUrl } from '@/services/connectionService';

export interface Announcement {
  id: string;
  title: string;
  description: string;
  imageURL?: string;
  college: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  category: 'event' | 'club' | 'update' | 'general' | 'announcements' | 'events' | 'clubs' | 'placement' | 'internship' | 'notice' | 'circular' | 'emergency';
}

interface AnnouncementState {
  announcements: Announcement[];
  isLoading: boolean;
  error: string | null;
  fetchAnnouncements: (college?: string) => Promise<void>;
  createAnnouncement: (data: Omit<Announcement, 'id' | 'createdAt'>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  getByCollege: (college: string) => Announcement[];
}

export const useAnnouncementStore = create<AnnouncementState>()(
  persist(
    (set, get) => ({
      announcements: [],
      isLoading: false,
      error: null,

      fetchAnnouncements: async (college = 'SR University') => {
        set({ isLoading: true, error: null });
        try {
          console.log('[AnnouncementStore] Fetching announcements from backend for:', college);
          const res = await fetch(`${getApiUrl()}/api/student/home-feed?college=${college}`);
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to fetch announcements');
          
          const announcements = (result.data || []).map((ann: any) => ({
            id: ann.id || ann._id,
            title: ann.title,
            description: ann.content,
            imageURL: ann.imageURL,
            college: ann.college,
            createdBy: ann.createdBy || 'admin',
            createdByName: ann.createdByName || 'Campus Admin',
            createdAt: ann.createdAt,
            category: ann.category,
          }));

          set({ announcements, isLoading: false });
        } catch (error) {
          console.error('[AnnouncementStore] Error fetching announcements:', error);
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Failed to fetch announcements', announcements: [] });
        }
      },

      createAnnouncement: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const payload = {
            title: data.title,
            content: data.description,
            college: data.college,
            category: data.category,
            imageURL: data.imageURL || '',
          };

          const res = await fetch(`${getApiUrl()}/api/admin/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to create announcement');

          const ann = result.data;
          const announcement: Announcement = {
            id: ann.id || ann._id,
            title: ann.title,
            description: ann.content,
            imageURL: ann.imageURL,
            college: ann.college,
            createdBy: ann.createdBy || 'admin',
            createdByName: ann.createdByName || 'Campus Admin',
            createdAt: ann.createdAt,
            category: ann.category,
          };

          set((state) => ({
            announcements: [announcement, ...state.announcements],
            isLoading: false,
          }));

          toast.success('Announcement published! 📢');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to create announcement';
          console.error('❌ Error creating announcement:', errorMsg);
          set({ isLoading: false, error: errorMsg });
          toast.error(`❌ ${errorMsg}`);
          throw error;
        }
      },

      deleteAnnouncement: async (id) => {
        try {
          const res = await fetch(`${getApiUrl()}/api/admin/posts/${id}`, {
            method: 'DELETE'
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to delete announcement');

          set(s => ({ announcements: s.announcements.filter(a => a.id !== id) }));
          toast.success('Announcement deleted');
        } catch (error) {
          console.error('[AnnouncementStore] Error deleting announcement:', error);
          toast.error('Failed to delete announcement');
        }
      },

      getByCollege: (college) => {
        return get().announcements.filter(a => 
          a.college.toLowerCase() === college.toLowerCase()
        );
      },
    }),
    { name: 'campus-connect-announcements' }
  )
);

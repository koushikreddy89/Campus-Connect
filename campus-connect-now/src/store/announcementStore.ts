import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { getApiUrl } from '@/services/connectionService';
import { useAuthStore } from './authStore';

export interface Announcement {
  id: string;
  _id?: string;
  title: string;
  description: string;
  imageURL?: string;
  college: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  category: 'event' | 'club' | 'update' | 'general' | 'announcements' | 'events' | 'clubs' | 'placement' | 'internship' | 'notice' | 'circular' | 'emergency';
  
  // Custom Broadcast Fields
  relatedId?: string;
  status?: 'draft' | 'active' | 'paused' | 'archived' | 'trash';
  publishDate?: string;
  expiryDate?: string;
  scheduledPublish?: string;
  visibility?: 'Public' | 'Restricted' | 'Private';
  views?: number;
  clicks?: number;
  applications?: number;
  deletedAt?: string;
  isPinned?: boolean;

  // Announcements
  summary?: string;
  subCategory?: string;
  priority?: 'Low' | 'Medium' | 'High';
  attachments?: string[];

  // Placements & Internships
  companyName?: string;
  companyLogo?: string;
  companyWebsite?: string;
  jobRole?: string;
  employmentType?: string;
  workMode?: string;
  package?: string;
  stipend?: string;
  skillsRequired?: string[];
  eligibilityAcademicYears?: string[];
  eligibilityDepartments?: string[];
  eligibilitySpecializations?: string[];
  eligibilityCGPA?: number;
  eligibilityBacklogs?: number;
  eligibilityBatch?: string;
  registrationLink?: string;
  registrationDeadline?: string;
  interviewProcess?: string;
  selectionRounds?: string[];
  documentsRequired?: string[];
  duration?: string;
  isPaid?: boolean;

  // College Events
  eventName?: string;
  eventBanner?: string;
  eventType?: string;
  organizingDepartment?: string;
  venue?: string;
  building?: string;
  hallNumber?: string;
  eventDate?: string;
  eventTime?: string;
  maxParticipants?: number;
  entryFee?: string;
  contactPerson?: string;
  contactNumber?: string;

  // Circular / Notice
  circularNumber?: string;
  issuedBy?: string;
  subject?: string;
  effectiveDate?: string;
  pdfAttachment?: string;
  supportingDocuments?: string[];

  // Emergency Alert
  alertCategory?: string;
  severity?: 'Critical' | 'High' | 'Medium';
  emergencyMessage?: string;
  instructions?: string;
  emergencyContacts?: string[];
  location?: string;
  affectedBuildings?: string[];
  alertStartTime?: string;
  alertEndTime?: string;
  sendPush?: boolean;
  sendEmail?: boolean;
  sendSMS?: boolean;
  requireAcknowledgement?: boolean;
  acknowledgedUsers?: string[];
}

interface AnnouncementState {
  announcements: Announcement[];
  isLoading: boolean;
  error: string | null;
  fetchAnnouncements: (college?: string) => Promise<void>;
  createAnnouncement: (data: Partial<Announcement>) => Promise<any>;
  updateAnnouncement: (id: string, data: Partial<Announcement>) => Promise<any>;
  deleteAnnouncement: (id: string) => Promise<void>;
  duplicateAnnouncement: (id: string) => Promise<void>;
  togglePinAnnouncement: (id: string) => Promise<void>;
  togglePauseAnnouncement: (id: string) => Promise<void>;
  restoreAnnouncement: (id: string) => Promise<void>;
  permanentDeleteAnnouncement: (id: string) => Promise<void>;
  archiveAnnouncement: (id: string) => Promise<void>;
  trackActivity: (id: string, action: 'view' | 'click' | 'apply') => Promise<void>;
  trackView: (id: string) => Promise<void>;
  trackClick: (id: string) => Promise<void>;
  fetchAnalytics: (id: string) => Promise<any>;
  fetchTrash: () => Promise<Announcement[]>;
  getByCollege: (college: string) => Announcement[];
}

function getAuthHeaders(contentType = 'application/json') {
  const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
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
          const role = useAuthStore.getState().role;
          const endpoint = role === 'admin'
            ? `${getApiUrl()}/api/admin/posts?college=${college}`
            : `${getApiUrl()}/api/student/home-feed?college=${college}`;

          console.log('[AnnouncementStore] Fetching announcements from backend for:', college, 'role:', role);
          const res = await fetch(endpoint, {
            headers: getAuthHeaders()
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to fetch announcements');
          
          const announcements = (result.data || []).map((ann: any) => ({
            ...ann,
            id: ann.id || ann._id,
            description: ann.content || ann.description
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
          const res = await fetch(`${getApiUrl()}/api/admin/posts`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to create announcement');

          const ann = result.data;
          const announcement: Announcement = {
            ...ann,
            id: ann.id || ann._id,
            description: ann.content || ann.description
          };

          set((state) => ({
            announcements: [announcement, ...state.announcements],
            isLoading: false,
          }));

          toast.success('Broadcast successfully published! 📢');
          return result;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to create announcement';
          console.error('❌ Error creating announcement:', errorMsg);
          set({ isLoading: false, error: errorMsg });
          toast.error(`❌ ${errorMsg}`);
          throw error;
        }
      },

      updateAnnouncement: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${getApiUrl()}/api/admin/posts/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to update announcement');

          const updated = {
            ...result.data,
            id: result.data.id || result.data._id,
            description: result.data.content || result.data.description
          };

          set((state) => ({
            announcements: state.announcements.map(a => a.id === id ? updated : a),
            isLoading: false,
          }));

          toast.success('Broadcast successfully updated! ✏️');
          return result;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to update announcement';
          set({ isLoading: false, error: errorMsg });
          toast.error(`❌ ${errorMsg}`);
          throw error;
        }
      },

      deleteAnnouncement: async (id) => {
        try {
          const res = await fetch(`${getApiUrl()}/api/admin/posts/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to delete announcement');

          set(s => ({ announcements: s.announcements.filter(a => a.id !== id) }));
          toast.success('Broadcast moved to Trash 🗑️');
        } catch (error) {
          console.error('[AnnouncementStore] Error deleting announcement:', error);
          toast.error('Failed to delete announcement');
        }
      },

      duplicateAnnouncement: async (id) => {
        try {
          const res = await fetch(`${getApiUrl()}/api/admin/posts/${id}/duplicate`, {
            method: 'POST',
            headers: getAuthHeaders()
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to duplicate announcement');

          const duplicated = {
            ...result.data,
            id: result.data.id || result.data._id,
            description: result.data.content || result.data.description
          };

          set(s => ({ announcements: [duplicated, ...s.announcements] }));
          toast.success('Broadcast duplicated successfully 📋');
        } catch (error) {
          console.error('[AnnouncementStore] Error duplicating announcement:', error);
          toast.error('Failed to duplicate announcement');
        }
      },

      togglePinAnnouncement: async (id) => {
        try {
          const res = await fetch(`${getApiUrl()}/api/admin/posts/${id}/pin`, {
            method: 'POST',
            headers: getAuthHeaders()
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to pin announcement');

          const updated = {
            ...result.data,
            id: result.data.id || result.data._id,
            description: result.data.content || result.data.description
          };

          set(s => ({ announcements: s.announcements.map(a => a.id === id ? updated : a) }));
          toast.success(updated.isPinned ? 'Announcement pinned 📌' : 'Announcement unpinned');
        } catch (error) {
          console.error('[AnnouncementStore] Error pinning announcement:', error);
        }
      },

      togglePauseAnnouncement: async (id) => {
        try {
          const res = await fetch(`${getApiUrl()}/api/admin/posts/${id}/pause`, {
            method: 'POST',
            headers: getAuthHeaders()
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to pause announcement');

          const updated = {
            ...result.data,
            id: result.data.id || result.data._id,
            description: result.data.content || result.data.description
          };

          set(s => ({ announcements: s.announcements.map(a => a.id === id ? updated : a) }));
          toast.success(updated.status === 'paused' ? 'Registration paused ⏸️' : 'Registration active ▶️');
        } catch (error) {
          console.error('[AnnouncementStore] Error pausing announcement:', error);
        }
      },

      restoreAnnouncement: async (id) => {
        try {
          const res = await fetch(`${getApiUrl()}/api/admin/posts/${id}/restore`, {
            method: 'POST',
            headers: getAuthHeaders()
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to restore announcement');

          const restored = {
            ...result.data,
            id: result.data.id || result.data._id,
            description: result.data.content || result.data.description
          };

          set(s => ({ announcements: [restored, ...s.announcements] }));
          toast.success('Broadcast restored successfully 🔄');
        } catch (error) {
          console.error('[AnnouncementStore] Error restoring announcement:', error);
          toast.error('Failed to restore announcement');
        }
      },

      permanentDeleteAnnouncement: async (id) => {
        try {
          const res = await fetch(`${getApiUrl()}/api/admin/posts/${id}/permanent-delete`, {
            method: 'POST',
            headers: getAuthHeaders()
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to permanently delete announcement');

          toast.success('Broadcast permanently deleted');
        } catch (error) {
          console.error('[AnnouncementStore] Error permanently deleting:', error);
          toast.error('Failed to delete permanently');
        }
      },

      archiveAnnouncement: async (id) => {
        try {
          const res = await fetch(`${getApiUrl()}/api/admin/posts/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: 'archived' })
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to archive announcement');

          const updated = {
            ...result.data,
            id: result.data.id || result.data._id,
            description: result.data.content || result.data.description
          };

          set(s => ({ announcements: s.announcements.map(a => a.id === id ? updated : a) }));
          toast.success('Broadcast archived successfully 📁');
        } catch (error) {
          console.error('[AnnouncementStore] Error archiving announcement:', error);
          toast.error('Failed to archive announcement');
        }
      },

      trackActivity: async (id, action) => {
        try {
          const endpoint = action === 'view' ? '/api/analytics/view' : '/api/analytics/click';
          const res = await fetch(`${getApiUrl()}${endpoint}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ announcementId: id })
          });
          const result = await res.json();
          if (result.success && result.data) {
            set((state) => ({
              announcements: state.announcements.map((a) =>
                a.id === id
                  ? {
                      ...a,
                      views: result.data.views,
                      clicks: result.data.clicks,
                      applications: result.data.applications,
                      uniqueViewers: result.data.uniqueViewers,
                      lastViewed: result.data.lastViewed,
                      lastClicked: result.data.lastClicked,
                    }
                  : a
              ),
            }));
          }
        } catch (e) {
          console.error('Failed to track activity:', e);
        }
      },

      trackView: async (id) => {
        const store = get();
        await store.trackActivity(id, 'view');
      },

      trackClick: async (id) => {
        const store = get();
        await store.trackActivity(id, 'click');
      },

      fetchAnalytics: async (id) => {
        try {
          const res = await fetch(`${getApiUrl()}/api/analytics/${id}`, {
            headers: getAuthHeaders()
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error || 'Failed to fetch analytics');
          return result.data;
        } catch (error) {
          console.error('[AnnouncementStore] Error fetching analytics:', error);
          throw error;
        }
      },

      fetchTrash: async () => {
        try {
          const res = await fetch(`${getApiUrl()}/api/admin/posts/trash`, {
            headers: getAuthHeaders()
          });
          const result = await res.json();
          if (!result.success) throw new Error(result.error);
          return (result.data || []).map((ann: any) => ({
            ...ann,
            id: ann.id || ann._id,
            description: ann.content || ann.description
          }));
        } catch (e) {
          console.error('Failed to fetch trash:', e);
          return [];
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

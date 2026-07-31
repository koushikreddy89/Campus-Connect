import { create } from 'zustand';
import { Notification } from '@/types';
import { notificationApi } from '@/services/api';
import { socketService } from '@/services/socketService';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  hasMore: boolean;
  page: number;
  loading: boolean;
  filter: string;
  searchQuery: string;

  setFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  fetchNotifications: (replace?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (ids?: string[]) => Promise<void>;
  deleteNotifications: (ids: string[]) => Promise<void>;
  addNotification: (n: any) => void;
  setupSocketListeners: (currentUserId: string) => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  hasMore: true,
  page: 1,
  loading: false,
  filter: 'all',
  searchQuery: '',

  setFilter: (filter) => {
    set({ filter, page: 1, hasMore: true });
    get().fetchNotifications(true);
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery, page: 1, hasMore: true });
    get().fetchNotifications(true);
  },

  fetchUnreadCount: async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      if (res && res.success) {
        set({ unreadCount: res.count });
      }
    } catch (e) {
      console.error('Failed to get unread count:', e);
    }
  },

  fetchNotifications: async (replace = false) => {
    const { page, filter, searchQuery, notifications, loading, hasMore } = get();
    if (loading || (!hasMore && !replace)) return;

    set({ loading: true });
    try {
      const currentPage = replace ? 1 : page;
      const res = await notificationApi.getNotifications(filter, searchQuery, currentPage, 15);
      if (res && res.success) {
        const notifs = (res.data || []).map((n: any) => ({
          id: n._id || n.id,
          userId: n.userId || n.recipientId,
          recipientId: n.recipientId || n.userId,
          senderId: n.senderId,
          type: n.type,
          title: n.title,
          body: n.message || n.body || '',
          read: n.isRead ?? n.read ?? false,
          createdAt: n.createdAt,
          relatedId: n.entityId || n.relatedId,
          entityId: n.entityId || n.relatedId,
          entityType: n.entityType || '',
          metadata: n.metadata || {}
        }));

        set({
          notifications: replace ? notifs : [...notifications, ...notifs],
          page: currentPage + 1,
          hasMore: notifs.length === 15,
          loading: false
        });
        get().fetchUnreadCount();
      } else {
        set({ loading: false });
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      set({ loading: false });
    }
  },

  addNotification: (n) => {
    const parsed: Notification = {
      id: n._id || n.id,
      userId: n.userId || n.recipientId,
      senderId: n.senderId,
      type: n.type,
      title: n.title,
      body: n.message || n.body || '',
      read: n.isRead ?? n.read ?? false,
      createdAt: n.createdAt || new Date().toISOString(),
      relatedId: n.entityId || n.relatedId,
      metadata: n.metadata || {}
    };

    set((s) => {
      // Avoid duplicate keys
      const filtered = s.notifications.filter((existing) => existing.id !== parsed.id);
      return {
        notifications: [parsed, ...filtered],
        unreadCount: s.unreadCount + (parsed.read ? 0 : 1)
      };
    });
  },

  markRead: async (ids) => {
    try {
      await notificationApi.markAsRead(ids);
      set((s) => {
        const notifications = s.notifications.map((n) => {
          if (!ids || ids.includes(n.id)) {
            return { ...n, read: true };
          }
          return n;
        });
        return {
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length
        };
      });
    } catch (e) {
      console.error('Failed to mark read:', e);
    }
  },

  deleteNotifications: async (ids) => {
    try {
      await notificationApi.deleteNotifications(ids);
      set((s) => {
        const notifications = s.notifications.filter((n) => !ids.includes(n.id));
        return {
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length
        };
      });
    } catch (e) {
      console.error('Failed to delete notifications:', e);
    }
  },

  setupSocketListeners: (currentUserId) => {
    const socket = socketService.getSocket();
    if (!socket) return () => {};

    // Join notification listener room for this specific user
    socket.emit('join_room', { roomId: `user_${currentUserId}` });

    const handleNewNotif = (notif: any) => {
      get().addNotification(notif);
    };

    const handleUpdateNotif = (notif: any) => {
      set((s) => {
        const notifications = s.notifications.map((n) => 
          n.id === (notif._id || notif.id) 
            ? {
                ...n,
                title: notif.title,
                body: notif.message || notif.body || '',
                read: notif.isRead ?? notif.read ?? false,
                metadata: notif.metadata || {}
              }
            : n
        );
        return {
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length
        };
      });
    };

    const handleReadNotif = ({ notificationIds }: any) => {
      set((s) => {
        const notifications = s.notifications.map((n) => {
          if (!notificationIds || notificationIds.includes(n.id)) {
            return { ...n, read: true };
          }
          return n;
        });
        return {
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length
        };
      });
    };

    const handleDeleteNotif = ({ notificationIds }: any) => {
      set((s) => {
        const notifications = s.notifications.filter((n) => !notificationIds.includes(n.id));
        return {
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length
        };
      });
    };

    socket.on('notification:new', handleNewNotif);
    socket.on('notification:update', handleUpdateNotif);
    socket.on('notification:read', handleReadNotif);
    socket.on('notification:delete', handleDeleteNotif);

    return () => {
      socket.off('notification:new', handleNewNotif);
      socket.off('notification:update', handleUpdateNotif);
      socket.off('notification:read', handleReadNotif);
      socket.off('notification:delete', handleDeleteNotif);
      socket.emit('leave_room', { roomId: `user_${currentUserId}` });
    };
  }
}));

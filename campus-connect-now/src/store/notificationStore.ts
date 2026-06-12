import { create } from 'zustand';
import { Notification } from '@/types';
import { notificationApi } from '@/services/api';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, 'id' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  initializeNotifications: (notifications: Notification[]) => void;
  fetchNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const res = await notificationApi.getNotifications();
      if (res && res.success) {
        const notifs = (res.data || []).map((n: any) => ({
          id: n._id || n.id,
          userId: n.userId,
          type: n.type,
          title: n.title,
          body: n.body,
          read: n.read,
          createdAt: n.createdAt,
          relatedId: n.relatedId
        }));
        set({
          notifications: notifs,
          unreadCount: notifs.filter((n: any) => !n.read).length
        });
      }
    } catch (err) {
      console.error('Failed to fetch notifications in store:', err);
    }
  },

  addNotification: (n) => {
    const notification: Notification = {
      ...n,
      id: `n-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      notifications: [notification, ...s.notifications],
      unreadCount: s.unreadCount + (notification.read ? 0 : 1),
    }));
  },

  markRead: async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      set((s) => {
        const notifications = s.notifications.map(n => n.id === id ? { ...n, read: true } : n);
        return { notifications, unreadCount: notifications.filter(n => !n.read).length };
      });
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  },

  markAllRead: () => {
    set((s) => ({
      notifications: s.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  initializeNotifications: (notifications: Notification[]) => {
    set({
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
    });
  },
}));

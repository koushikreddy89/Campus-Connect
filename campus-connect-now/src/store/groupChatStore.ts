import { create } from 'zustand';
import { GroupChat, GroupMessage } from '@/types';
import { getCurrentUserEmail } from '@/utils/userUtils';
import { groupChatApi } from '@/services/api';

interface GroupChatState {
  groups: GroupChat[];
  groupMessages: Record<string, GroupMessage[]>;
  currentUserEmail: string;
  fetchGroups: () => Promise<void>;
  fetchGroupMessages: (groupId: string) => Promise<void>;
  createGroup: (name: string, memberIds: string[]) => Promise<void>;
  sendGroupMessage: (groupId: string, text: string) => Promise<void>;
  addMember: (groupId: string, userId: string) => void;
  removeMember: (groupId: string, userId: string) => void;
  initializeGroups: (groups: GroupChat[], messages: Record<string, GroupMessage[]>, userEmail: string) => void;
}

export const useGroupChatStore = create<GroupChatState>((set, get) => ({
  groups: [],
  groupMessages: {},
  currentUserEmail: getCurrentUserEmail() || 'user@example.com',

  fetchGroups: async () => {
    try {
      const res = await groupChatApi.getGroups();
      if (res && res.success) {
        set({ groups: res.data || [] });
      }
    } catch (error) {
      console.error('Error fetching groups in store:', error);
    }
  },

  fetchGroupMessages: async (groupId: string) => {
    try {
      const res = await groupChatApi.getGroupMessages(groupId);
      if (res && res.success) {
        const currentMessages = get().groupMessages;
        set({
          groupMessages: {
            ...currentMessages,
            [groupId]: res.data || []
          }
        });
      }
    } catch (error) {
      console.error('Error fetching group messages in store:', error);
    }
  },

  createGroup: async (name: string, memberIds: string[]) => {
    try {
      const res = await groupChatApi.createGroup(name, memberIds);
      if (res && res.success && res.data) {
        const list = get().groups;
        set({ groups: [res.data, ...list] });
      }
    } catch (error) {
      console.error('Error creating group in store:', error);
    }
  },

  sendGroupMessage: async (groupId: string, text: string) => {
    try {
      const res = await groupChatApi.sendGroupMessage(groupId, text);
      if (res && res.success && res.data) {
        const currentMessages = get().groupMessages;
        const list = currentMessages[groupId] || [];
        
        // Update last message details in groups list
        const updatedGroups = get().groups.map(g =>
          (g.id === groupId || (g as any)._id === groupId)
            ? { ...g, lastMessage: text, lastMessageAt: res.data.timestamp }
            : g
        );

        set({
          groupMessages: {
            ...currentMessages,
            [groupId]: [...list, res.data]
          },
          groups: updatedGroups
        });
      }
    } catch (error) {
      console.error('Error sending group message in store:', error);
    }
  },

  addMember: (groupId: string, userId: string) => {
    set(s => ({
      groups: s.groups.map(g =>
        (g.id === groupId || (g as any)._id === groupId) && !g.members.includes(userId)
          ? { ...g, members: [...g.members, userId] }
          : g
      ),
    }));
  },

  removeMember: (groupId: string, userId: string) => {
    set(s => ({
      groups: s.groups.map(g =>
        g.id === groupId || (g as any)._id === groupId ? { ...g, members: g.members.filter(m => m !== userId) } : g
      ),
    }));
  },

  initializeGroups: (groups: GroupChat[], messages: Record<string, GroupMessage[]>, userEmail: string) => {
    set({ groups, groupMessages: messages, currentUserEmail: userEmail });
  },
}));

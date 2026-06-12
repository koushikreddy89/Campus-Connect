import { create } from 'zustand';
import { Message, ReactionEmoji } from '@/types';
import { getCurrentUserEmail } from '@/utils/userUtils';
import { chatApi } from '@/services/api';

interface ChatState {
  messages: Record<string, Message[]>;
  typingMatchId: string | null;
  currentUserEmail: string;
  fetchMessages: (matchId: string) => Promise<void>;
  sendMessage: (matchId: string, text: string) => Promise<void>;
  reactToMessage: (matchId: string, messageId: string, emoji: ReactionEmoji) => Promise<void>;
  initializeMessages: (messages: Record<string, Message[]>, userEmail: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  typingMatchId: null,
  currentUserEmail: getCurrentUserEmail() || 'user@example.com',

  fetchMessages: async (matchId: string) => {
    try {
      const res = await chatApi.getMessages(matchId);
      if (res && res.success) {
        const currentMsgs = get().messages;
        set({
          messages: {
            ...currentMsgs,
            [matchId]: res.data || []
          }
        });
      }
    } catch (error) {
      console.error('Error fetching messages in store:', error);
    }
  },

  sendMessage: async (matchId: string, text: string) => {
    try {
      const res = await chatApi.sendMessage(matchId, text);
      if (res && res.success && res.data) {
        const currentMsgs = get().messages;
        const list = currentMsgs[matchId] || [];
        set({
          messages: {
            ...currentMsgs,
            [matchId]: [...list, res.data]
          }
        });
      }
    } catch (error) {
      console.error('Error sending message in store:', error);
    }
  },

  reactToMessage: async (matchId: string, messageId: string, emoji: ReactionEmoji) => {
    try {
      const res = await chatApi.reactToMessage(matchId, messageId, emoji);
      if (res && res.success && res.data) {
        const currentMsgs = get().messages;
        const list = currentMsgs[matchId] || [];
        const updated = list.map(m => (m.id === messageId || (m as any)._id === messageId) ? res.data : m);
        set({
          messages: {
            ...currentMsgs,
            [matchId]: updated
          }
        });
      }
    } catch (error) {
      console.error('Error reacting to message in store:', error);
    }
  },

  initializeMessages: (messages: Record<string, Message[]>, userEmail: string) => {
    set({ messages, currentUserEmail: userEmail });
  },
}));

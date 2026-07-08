import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { Message, ReactionEmoji } from '@/types';
import { getCurrentUserEmail } from '@/utils/userUtils';
import { chatApi } from '@/services/api';
import { ResonanceState } from '@/components/chat/ResonanceThread';
import { socketService } from '@/services/socketService';

interface ChatState {
  messages: Record<string, Message[]>;
  typingMatchId: string | null;
  currentUserEmail: string;
  resonanceQueue: Array<{ matchId: string; messageId: string; state: ResonanceState }>;
  fetchMessages: (matchId: string) => Promise<void>;
  sendMessage: (matchId: string, text: string, messageType?: 'text' | 'image' | 'file', attachments?: any[]) => Promise<void>;
  forwardMessage: (targetRoomIds: string[], messageId: string, caption?: string, messageType?: 'text' | 'image' | 'file', attachments?: any[]) => Promise<any>;
  reactToMessage: (matchId: string, messageId: string, emoji: ReactionEmoji) => Promise<void>;
  initializeMessages: (messages: Record<string, Message[]>, userEmail: string) => void;
  markResonanceState: (matchId: string, messageId: string, state: ResonanceState) => Promise<void>;
  focusChannel: (matchId: string, isFocused: boolean) => Promise<void>;
  connectSocket: () => void;
  disconnectSocket: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  typingMatchId: null,
  currentUserEmail: getCurrentUserEmail() || 'user@example.com',
  resonanceQueue: [],

  connectSocket: () => {
    const token = localStorage.getItem('token') || '';
    const socket = socketService.connect(token);

    if (!socket) return;

    // Remove any existing listeners to prevent duplicate triggers
    socket.off('message:received');
    socket.off('resonance:state_changed');
    socket.off('resonance:focus_changed');
    socket.off('typing');

    // 1. Message received listener
    socket.on('message:received', (msg: Message) => {
      const currentUserId = useAuthStore.getState()._id;
      if (msg.senderId === currentUserId) {
        // The sender handles message insertion via HTTP response (optimistic replacement)
        // to prevent duplication and preserve correct insertion order.
        return;
      }

      const currentMsgs = get().messages;
      const list = currentMsgs[msg.matchId] || [];
      
      // Prevent duplicates
      const exists = list.some(m => m.id === msg.id || (m as any)._id === (msg as any)._id || (m as any)._id === msg.id || m.id === (msg as any)._id);
      if (exists) return;

      set({
        messages: {
          ...currentMsgs,
          [msg.matchId]: [...list, msg]
        }
      });
    });

    // 2. Resonance state changed listener
    socket.on('resonance:state_changed', ({ messageId, resonanceState, status }) => {
      const currentMsgs = get().messages;
      
      // Update matches in all chats
      const updatedMessages: Record<string, Message[]> = {};
      Object.keys(currentMsgs).forEach(matchId => {
        updatedMessages[matchId] = currentMsgs[matchId].map(m => {
          if (m.id === messageId || (m as any)._id === messageId) {
            return { ...m, resonanceState, status };
          }
          return m;
        });
      });

      set({ messages: updatedMessages });
    });

    // 3. Typing indicator listener
    socket.on('typing', ({ roomId, userId, isTyping }) => {
      const currentUserId = useChatStore.getState().currentUserEmail; // fallback identifier
      // If typing is from the other user, show the typing indicator
      if (isTyping) {
        set({ typingMatchId: roomId });
      } else {
        set({ typingMatchId: null });
      }
    });
  },

  disconnectSocket: () => {
    socketService.disconnect();
  },

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

  sendMessage: async (matchId: string, text: string, messageType: 'text' | 'image' | 'file' = 'text', attachments: any[] = []) => {
    try {
      // Optimistic message placeholder
      const tempId = `temp-${Date.now()}`;
      const senderId = useAuthStore.getState()._id || 'current-user';
      const tempMsg: Message = {
        id: tempId,
        _id: tempId,
        matchId,
        senderId,
        messageType,
        text,
        attachments,
        timestamp: new Date().toISOString(),
        read: false,
        status: 'sent',
        resonanceState: 'dormant',
        reactions: []
      } as any;

      const currentMsgs = get().messages;
      const list = currentMsgs[matchId] || [];
      set({
        messages: {
          ...currentMsgs,
          [matchId]: [...list, tempMsg]
        }
      });

      const res = await chatApi.sendMessage(matchId, text, messageType, attachments);
      if (res && res.success && res.data) {
        // Replace the optimistic message with the database saved message
        const updatedMsgs = get().messages;
        const freshList = updatedMsgs[matchId] || [];
        const index = freshList.findIndex(m => m.id === tempId);
        
        if (index > -1) {
          const listCopy = [...freshList];
          listCopy[index] = res.data;
          set({
            messages: {
              ...updatedMsgs,
              [matchId]: listCopy
            }
          });
        }
        
        // Notify socket of state update (bridged -> harmonized / vibrant)
        const socket = socketService.getSocket();
        if (socket?.connected) {
          socket.emit('typing', { roomId: matchId, isTyping: false });
        }
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

  forwardMessage: async (targetRoomIds: string[], messageId: string, caption?: string, messageType?: 'text' | 'image' | 'file', attachments?: any[]) => {
    try {
      const res = await chatApi.forwardMessage(targetRoomIds, messageId, caption, messageType, attachments);
      if (res && res.success && res.data) {
        const currentMsgs = get().messages;
        const newMsgsState = { ...currentMsgs };

        res.data.forEach((item: any) => {
          if (item.type === 'direct') {
            const list = newMsgsState[item.targetId] || [];
            newMsgsState[item.targetId] = [...list, item.message];
          }
        });

        set({ messages: newMsgsState });
      }
      return res;
    } catch (error) {
      console.error('Error forwarding message in store:', error);
      return { success: false, error: 'Failed to forward message.' };
    }
  },

  initializeMessages: (messages: Record<string, Message[]>, userEmail: string) => {
    set({ messages, currentUserEmail: userEmail });
  },

  markResonanceState: async (matchId: string, messageId: string, state: ResonanceState) => {
    try {
      // Optimistically update local message resonanceState
      const currentMsgs = get().messages;
      const list = currentMsgs[matchId] || [];
      const updated = list.map(m => {
        if (m.id === messageId || (m as any)._id === messageId) {
          return { ...m, resonanceState: state, status: state === 'absorbed' ? 'seen' : 'delivered' };
        }
        return m;
      });
      set({
        messages: {
          ...currentMsgs,
          [matchId]: updated
        }
      });

      // Update backend
      const res = await fetch(`http://localhost:5000/api/chats/${matchId}/messages/${messageId}/resonance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ state })
      });

      if (!res.ok) {
        set(s => ({
          resonanceQueue: [...s.resonanceQueue, { matchId, messageId, state }]
        }));
      }
    } catch (error) {
      console.error('Failed to update resonance state, queuing locally:', error);
      set(s => ({
        resonanceQueue: [...s.resonanceQueue, { matchId, messageId, state }]
      }));
    }
  },

  focusChannel: async (matchId: string, isFocused: boolean) => {
    try {
      if (isFocused) {
        socketService.joinRoom(`match_${matchId}`);
      } else {
        socketService.leaveRoom(`match_${matchId}`);
      }

      await fetch(`http://localhost:5000/api/chats/${matchId}/focus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ isFocused })
      });
    } catch (error) {
      console.error('Failed to notify channel focus:', error);
    }
  }
}));

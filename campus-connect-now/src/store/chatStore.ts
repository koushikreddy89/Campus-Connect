import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { useMatchStore } from './matchStore';
import { Message, ReactionEmoji } from '@/types';
import { getCurrentUserEmail } from '@/utils/userUtils';
import { chatApi } from '@/services/api';
import { ResonanceState } from '@/components/chat/ResonanceThread';
import { socketService } from '@/services/socketService';
import { getApiUrl } from '@/services/connectionService';

interface ChatState {
  messages: Record<string, Message[]>;
  typingMatchId: string | null;
  focusedMatchId: string | null;
  currentUserEmail: string;
  resonanceQueue: Array<{ matchId: string; messageId: string; state: ResonanceState }>;
  sharedPhotos: Record<string, any[]>;
  sharedDocs: Record<string, any[]>;
  sharedLinks: Record<string, any[]>;
  fetchSharedAssets: (matchId: string) => Promise<void>;
  openMessage: (matchId: string, messageId: string) => Promise<void>;
  fetchMessages: (matchId: string) => Promise<void>;
  sendMessage: (matchId: string, text: string, messageType?: 'text' | 'image' | 'file' | 'document' | 'link', attachments?: any[], retentionMode?: 'VIEW_ONCE' | 'NEVER_DELETE') => Promise<void>;
  forwardMessage: (targetRoomIds: string[], messageId: string, caption?: string, messageType?: 'text' | 'image' | 'file' | 'document' | 'link', attachments?: any[]) => Promise<any>;
  reactToMessage: (matchId: string, messageId: string, emoji: ReactionEmoji) => Promise<void>;
  initializeMessages: (messages: Record<string, Message[]>, userEmail: string) => void;
  markResonanceState: (matchId: string, messageId: string, state: ResonanceState) => Promise<void>;
  focusChannel: (matchId: string, isFocused: boolean) => Promise<void>;
  connectSocket: () => void;
  disconnectSocket: () => void;
  replyToMessage: (matchId: string, messageId: string, text: string, messageType?: 'text' | 'image' | 'file' | 'document' | 'link') => Promise<void>;
  pinMessage: (matchId: string, messageId: string) => Promise<void>;
  bookmarkMessage: (matchId: string, messageId: string) => Promise<void>;
  shareMessage: (matchId: string, messageId: string, targetMatchId: string) => Promise<void>;
  deleteMessageForMe: (matchId: string, messageId: string) => Promise<void>;
  deleteMessageForEveryone: (matchId: string, messageId: string) => Promise<void>;
  getMessageDetails: (messageId: string) => Promise<any>;
}
export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  typingMatchId: null,
  focusedMatchId: null,
  currentUserEmail: getCurrentUserEmail() || 'user@example.com',
  resonanceQueue: [],
  sharedPhotos: {},
  sharedDocs: {},
  sharedLinks: {},

  fetchSharedAssets: async (matchId: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      const headers = { 'Authorization': `Bearer ${token}` };

      const [photosRes, docsRes, linksRes] = await Promise.all([
        fetch(`http://localhost:5000/api/chat/${matchId}/shared/photos`, { headers }).then(r => r.json()),
        fetch(`http://localhost:5000/api/chat/${matchId}/shared/documents`, { headers }).then(r => r.json()),
        fetch(`http://localhost:5000/api/chat/${matchId}/shared/links`, { headers }).then(r => r.json())
      ]);

      set(state => ({
        sharedPhotos: { ...state.sharedPhotos, [matchId]: photosRes.data || [] },
        sharedDocs: { ...state.sharedDocs, [matchId]: docsRes.data || [] },
        sharedLinks: { ...state.sharedLinks, [matchId]: linksRes.data || [] }
      }));
    } catch (e) {
      console.error('Error fetching shared assets:', e);
    }
  },

  connectSocket: () => {
    const token = localStorage.getItem('token') || '';
    const socket = socketService.connect(token);

    if (!socket) return;

    // Handle tab visibility and focus manually
    const updatePresence = (isOnline: boolean) => {
      const tok = localStorage.getItem('token') || '';
      if (tok) {
        fetch('http://localhost:5000/api/users/presence', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tok}`
          },
          body: JSON.stringify({ isOnline })
        }).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      updatePresence(document.visibilityState === 'visible');
    };

    const handleFocus = () => updatePresence(true);
    const handleBlur = () => updatePresence(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Remove any existing listeners to prevent duplicate triggers
    socket.off('message:received');
    socket.off('resonance:state_changed');
    socket.off('resonance:focus_changed');
    socket.off('typing');
    socket.off('presence:status');
    socket.off('message:seen');
    socket.off('chat:media_update');
    socket.off('message:opened');
    socket.off('message:reactions_updated');
    socket.off('message:pinned_updated');
    socket.off('message:deleted_everyone');

    // 1. Message received listener
    socket.on('message:received', (msg: Message) => {
      const currentUserId = useAuthStore.getState()._id;
      const currentUserUid = useAuthStore.getState().uid;
      
      // Update media counts
      get().fetchSharedAssets(msg.matchId);

      if (
        String(msg.senderId) === String(currentUserId) ||
        String(msg.senderId) === String(currentUserUid)
      ) {
        return;
      }

      const currentMsgs = get().messages;
      const list = currentMsgs[msg.matchId] || [];
      
      const exists = list.some(m => m.id === msg.id || (m as any)._id === (msg as any)._id || (m as any)._id === msg.id || m.id === (msg as any)._id);
      if (exists) return;

      const isCurrentChatFocused = get().focusedMatchId === msg.matchId;
      if (isCurrentChatFocused) {
        msg.read = true;
        msg.status = 'seen';
        msg.seenAt = new Date().toISOString();
        chatApi.markAsRead(msg.matchId, msg.id || (msg as any)._id);
        const myId = currentUserId || currentUserUid;
        if (socket?.connected && myId) {
          socket.emit('message:seen', {
            conversationId: msg.matchId,
            seenBy: myId,
            seenAt: msg.seenAt
          });
        }
      } else {
        useMatchStore.getState().incrementUnreadCount(msg.matchId, msg.text || 'New message');
      }

      const seen = new Set<string>();
      const deduped = [...list, msg].filter(m => {
        const mid = m.id || (m as any)._id;
        if (!mid) return true;
        if (seen.has(mid)) return false;
        seen.add(mid);
        return true;
      });

      set({
        messages: {
          ...currentMsgs,
          [msg.matchId]: deduped
        }
      });
    });

    // 2. Resonance state changed listener
    socket.on('resonance:state_changed', ({ messageId, resonanceState, status }) => {
      const currentMsgs = get().messages;
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
      const currentUserId = useAuthStore.getState().uid;
      if (String(userId) === String(currentUserId)) return;

      if (isTyping) {
        set({ typingMatchId: roomId });
      } else {
        set({ typingMatchId: null });
      }
    });

    // 4. Presence status listener
    socket.on('presence:status', ({ userId, isOnline, lastSeen }) => {
      const matchStore = useMatchStore.getState();
      const updatedMatches = matchStore.matches.map(m => {
        if (m.userId === userId || m.user?.id === userId || m.user?.userId === userId) {
          return {
            ...m,
            isOnline,
            user: m.user ? { ...m.user, isOnline, lastSeen } : undefined
          };
        }
        return m;
      });
      matchStore.setMatches(updatedMatches);
    });

    // 5. Message seen listener
    socket.on('message:seen', ({ conversationId, seenBy, seenAt }) => {
      const currentMsgs = get().messages;
      const list = currentMsgs[conversationId] || [];
      const updated = list.map(m => {
        if (m.senderId !== seenBy && m.status !== 'seen') {
          return { ...m, status: 'seen', read: true, seenAt };
        }
        return m;
      });
      set({
        messages: {
          ...currentMsgs,
          [conversationId]: updated
        }
      });
    });

    // 6. Media counts update listener
    socket.on('chat:media_update', ({ matchId }) => {
      get().fetchSharedAssets(matchId);
    });

    // 7. Message opened listener
    socket.on('message:opened', ({ matchId, messageId, viewedAt }) => {
      const currentMsgs = get().messages;
      const list = currentMsgs[matchId] || [];
      const currentUserId = useAuthStore.getState()._id;
      
      const updated = list.map(m => {
        if (m.id === messageId || (m as any)._id === messageId) {
          const isOwn = String(m.senderId) === String(currentUserId);
          return {
            ...m,
            viewed: true,
            viewedAt,
            text: isOwn ? 'Opened' : 'You opened this message. This message disappeared.',
            attachments: [],
            documentUrl: undefined,
            documentName: undefined,
            imageUrl: undefined,
            url: undefined,
            title: undefined,
            description: undefined,
            thumbnail: undefined
          };
        }
        return m;
      });

      set({
        messages: {
          ...currentMsgs,
          [matchId]: updated
        }
      });
    });

    // 8. Reactions updated listener
    socket.on('message:reactions_updated', ({ messageId, reactions, matchId }) => {
      const currentMsgs = get().messages;
      const list = currentMsgs[matchId] || [];
      const updated = list.map(m => {
        if (m.id === messageId || (m as any)._id === messageId) {
          return { ...m, reactions };
        }
        return m;
      });
      set({
        messages: {
          ...currentMsgs,
          [matchId]: updated
        }
      });
    });

    // 9. Pinned updated listener
    socket.on('message:pinned_updated', ({ messageId, pinned, pinnedBy, pinnedAt, matchId }) => {
      const currentMsgs = get().messages;
      const list = currentMsgs[matchId] || [];
      const updated = list.map(m => {
        if (m.id === messageId || (m as any)._id === messageId) {
          return { ...m, pinned, pinnedBy, pinnedAt };
        }
        return m;
      });
      set({
        messages: {
          ...currentMsgs,
          [matchId]: updated
        }
      });
    });

    // 10. Deleted for everyone listener
    socket.on('message:deleted_everyone', ({ messageId, matchId }) => {
      const currentMsgs = get().messages;
      const list = currentMsgs[matchId] || [];
      const updated = list.map(m => {
        if (m.id === messageId || (m as any)._id === messageId) {
          return {
            ...m,
            text: 'This message was deleted.',
            attachments: [],
            imageUrl: null,
            documentUrl: null,
            documentName: null,
            mimeType: null,
            fileSize: null,
            url: null,
            title: null,
            description: null,
            thumbnail: null,
            deletedForEveryone: true
          };
        }
        return m;
      });
      set({
        messages: {
          ...currentMsgs,
          [matchId]: updated
        }
      });
    });
  },

  disconnectSocket: () => {
    socketService.disconnect();
  },

  openMessage: async (matchId: string, messageId: string) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token') || '';
      const res = await fetch(`${getApiUrl()}/api/chats/${matchId}/messages/${messageId}/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data && data.success) {
        const currentMsgs = get().messages;
        const list = currentMsgs[matchId] || [];
        const currentUserId = useAuthStore.getState()._id;
        
        const updated = list.map(m => {
          if (m.id === messageId || (m as any)._id === messageId) {
            const isOwn = String(m.senderId) === String(currentUserId);
            return {
              ...m,
              viewed: true,
              viewedAt: data.data?.viewedAt || new Date().toISOString(),
              text: isOwn ? 'Opened' : 'You opened this message. This message disappeared.',
              attachments: [],
              documentUrl: undefined,
              documentName: undefined,
              imageUrl: undefined,
              url: undefined,
              title: undefined,
              description: undefined,
              thumbnail: undefined
            };
          }
          return m;
        });

        set({
          messages: {
            ...currentMsgs,
            [matchId]: updated
          }
        });
        return data.data?.text || '';
      }
    } catch (e) {
      console.error('Error opening View Once message:', e);
    }
    return '';
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

  sendMessage: async (matchId: string, text: string, messageType: 'text' | 'image' | 'file' | 'document' | 'link' = 'text', attachments: any[] = [], retentionMode?: 'VIEW_ONCE' | 'NEVER_DELETE') => {
    try {
      // Optimistic message placeholder
      const tempId = `temp-${Date.now()}`;
      const senderId = useAuthStore.getState()._id || 'current-user';
      const tempMsg: Message = {
        id: tempId,
        _id: tempId,
        stableKey: tempId,
        matchId,
        senderId,
        messageType,
        text,
        attachments,
        timestamp: new Date().toISOString(),
        read: false,
        status: 'sending',
        resonanceState: 'dormant',
        reactions: [],
        retentionMode: retentionMode || 'NEVER_DELETE'
      } as any;

      const currentMsgs = get().messages;
      const list = currentMsgs[matchId] || [];
      set({
        messages: {
          ...currentMsgs,
          [matchId]: [...list, tempMsg]
        }
      });

      const res = await chatApi.sendMessage(matchId, text, messageType, attachments, retentionMode);
      if (res && res.success && res.data) {
        // Replace the optimistic message with the database saved message
        const updatedMsgs = get().messages;
        const freshList = updatedMsgs[matchId] || [];
        const index = freshList.findIndex(m => m.id === tempId);
        
        if (index > -1) {
          const listCopy = [...freshList];
          listCopy[index] = {
            ...listCopy[index],
            id: res.data.id || res.data._id,
            _id: res.data._id || res.data.id,
            stableKey: listCopy[index].stableKey || res.data.id || res.data._id,
            status: res.data.status || 'delivered',
            timestamp: res.data.timestamp,
            resonanceState: res.data.resonanceState || listCopy[index].resonanceState,
            reactions: res.data.reactions || listCopy[index].reactions,
            seenAt: res.data.seenAt,
            deliveredAt: res.data.deliveredAt
          };

          const seen = new Set<string>();
          const deduped = listCopy.filter(m => {
            const mid = m.id || (m as any)._id;
            if (!mid) return true;
            if (seen.has(mid)) return false;
            seen.add(mid);
            return true;
          });

          set({
            messages: {
              ...updatedMsgs,
              [matchId]: deduped
            }
          });
        }

        // Fetch shared media counts and lists on successful send
        get().fetchSharedAssets(matchId);
        
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

  replyToMessage: async (matchId: string, messageId: string, text: string, messageType: 'text' | 'image' | 'file' | 'document' | 'link' = 'text') => {
    try {
      const res = await chatApi.replyToMessage(messageId, text, messageType);
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
      console.error('Error replying to message in store:', error);
    }
  },

  pinMessage: async (matchId: string, messageId: string) => {
    try {
      const res = await chatApi.pinMessage(messageId);
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
      console.error('Error pinning message in store:', error);
    }
  },

  bookmarkMessage: async (matchId: string, messageId: string) => {
    try {
      const res = await chatApi.bookmarkMessage(messageId);
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
      console.error('Error bookmarking message in store:', error);
    }
  },

  shareMessage: async (matchId: string, messageId: string, targetMatchId: string) => {
    try {
      await chatApi.shareMessage(messageId, targetMatchId);
    } catch (error) {
      console.error('Error sharing message in store:', error);
    }
  },

  deleteMessageForMe: async (matchId: string, messageId: string) => {
    try {
      const res = await chatApi.deleteMessageForMe(messageId);
      if (res && res.success) {
        const currentMsgs = get().messages;
        const list = currentMsgs[matchId] || [];
        const updated = list.filter(m => m.id !== messageId && (m as any)._id !== messageId);
        set({
          messages: {
            ...currentMsgs,
            [matchId]: updated
          }
        });
      }
    } catch (error) {
      console.error('Error deleting message for me in store:', error);
    }
  },

  deleteMessageForEveryone: async (matchId: string, messageId: string) => {
    try {
      const res = await chatApi.deleteMessageForEveryone(messageId);
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
      console.error('Error deleting message for everyone in store:', error);
    }
  },

  getMessageDetails: async (messageId: string) => {
    try {
      const res = await chatApi.getMessageDetails(messageId);
      return res;
    } catch (error) {
      console.error('Error getting message details in store:', error);
      return { success: false, error: 'Failed to retrieve message details' };
    }
  },

  forwardMessage: async (targetRoomIds: string[], messageId: string, caption?: string, messageType?: 'text' | 'image' | 'file' | 'document' | 'link', attachments?: any[]) => {
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
      set({ focusedMatchId: isFocused ? matchId : null });
      const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token') || '';
      
      if (isFocused) {
        socketService.joinRoom(`match_${matchId}`);
        chatApi.markAllAsRead(matchId);
        useMatchStore.getState().clearUnreadCount(matchId);

        // Also trigger the new patch read receipt endpoint
        if (token) {
          fetch('http://localhost:5000/api/messages/read', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ conversationId: matchId })
          }).catch(() => {});
        }

        const socket = socketService.getSocket();
        const myId = useAuthStore.getState().uid || useAuthStore.getState()._id;
        if (socket?.connected && myId) {
          socket.emit('message:seen', {
            conversationId: matchId,
            seenBy: myId,
            seenAt: new Date().toISOString()
          });
        }
      } else {
        socketService.leaveRoom(`match_${matchId}`);
      }

      await fetch(`http://localhost:5000/api/chats/${matchId}/focus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isFocused })
      });
    } catch (error) {
      console.error('Failed to notify channel focus:', error);
    }
  }
}));

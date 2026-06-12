import { create } from 'zustand';
import { User, Match, ConnectionRequest } from '@/types';
import { getEmailDomain } from '@/utils/validation';
import { getCurrentUserEmail } from '@/utils/userUtils';
import { matchApi } from '@/services/api';
import { toast } from 'sonner';

interface MatchState {
  swipePool: User[];
  matches: Match[];
  connectionRequests: ConnectionRequest[];
  sentRequests: string[];
  currentIndex: number;
  showMatchModal: boolean;
  newMatch: Match | null;
  isLoading: boolean;
  swipeFeedback: string | null;
  sendConnectionRequest: (userId: string) => Promise<void>;
  dislikeUser: () => void;
  acceptRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => void;
  closeMatchModal: () => void;
  revealIdentity: (matchId: string) => Promise<void>;
  clearSwipeFeedback: () => void;
  initializeSwipePool: (users: User[], currentMatches: Match[]) => void;
  setMatches: (matches: Match[]) => void;
  setConnectionRequests: (requests: ConnectionRequest[]) => void;
  fetchMatches: () => Promise<void>;
  fetchConnectionRequests: () => Promise<void>;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  swipePool: [],
  matches: [],
  connectionRequests: [],
  sentRequests: [],
  currentIndex: 0,
  showMatchModal: false,
  newMatch: null,
  isLoading: false,
  swipeFeedback: null,

  sendConnectionRequest: async (userId: string) => {
    const { swipePool, currentIndex, sentRequests } = get();
    const user = swipePool[currentIndex];
    if (!user || sentRequests.includes(userId)) {
      set({ currentIndex: currentIndex + 1 });
      return;
    }

    try {
      set({ isLoading: true });
      const res = await matchApi.sendConnectionRequest(userId);
      if (res && res.success) {
        set({
          sentRequests: [...sentRequests, userId],
          swipeFeedback: 'Request Sent 💌',
          currentIndex: currentIndex + 1,
        });

        toast('💌 Connection request sent!', {
          description: `Request sent to ${user.name ?? 'someone'}`,
          duration: 3000,
        });

        setTimeout(() => set({ swipeFeedback: null }), 1500);
      }
    } catch (e) {
      console.error('Error sending connection request:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  dislikeUser: () => set((s) => ({ currentIndex: s.currentIndex + 1 })),

  acceptRequest: async (requestId: string) => {
    const { connectionRequests, matches } = get();
    const request = connectionRequests.find(r => r.id === requestId);
    if (!request) return;

    try {
      set({ isLoading: true });
      const res = await matchApi.acceptRequest(requestId);
      if (res && res.success) {
        const newMatch: Match = {
          id: res.data?._id || `m-${Date.now()}`,
          userId: request.fromUserId,
          user: request.fromUser,
          matchedAt: new Date().toISOString(),
          unreadCount: 0,
          isRevealed: false,
        };

        set({
          connectionRequests: connectionRequests.filter(r => r.id !== requestId),
          matches: [newMatch, ...matches],
          showMatchModal: true,
          newMatch,
        });

        toast('🎉 It\'s a Match!', {
          description: `You matched with ${request.fromUser.name ?? 'someone'}. Start chatting!`,
          duration: 4000,
        });
      }
    } catch (e) {
      console.error('Error accepting request:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  rejectRequest: (requestId: string) => {
    set((s) => ({
      connectionRequests: s.connectionRequests.filter(r => r.id !== requestId),
    }));
  },

  closeMatchModal: () => set({ showMatchModal: false, newMatch: null }),

  revealIdentity: async (matchId: string) => {
    try {
      const res = await matchApi.revealIdentity(matchId);
      if (res && res.success) {
        set((s) => ({
          matches: s.matches.map(m => (m.id === matchId || (m as any)._id === matchId) ? { ...m, isRevealed: true } : m),
        }));
        toast.success('Identity revealed! 🎉');
      }
    } catch (e) {
      console.error('Error revealing identity:', e);
    }
  },

  clearSwipeFeedback: () => set({ swipeFeedback: null }),

  initializeSwipePool: (users: User[], currentMatches: Match[]) => {
    const currentEmail = getCurrentUserEmail();
    const userDomain = getEmailDomain(currentEmail ?? '');
    
    const filtered = users.filter(u =>
      !currentMatches.find(m => m.userId === u.id) &&
      u.email !== currentEmail &&
      getEmailDomain(u.email ?? '') === userDomain
    );
    
    set({ swipePool: filtered });
  },

  setMatches: (matches: Match[]) => set({ matches }),

  setConnectionRequests: (requests: ConnectionRequest[]) => set({ connectionRequests: requests }),

  fetchMatches: async () => {
    try {
      set({ isLoading: true });
      const res = await matchApi.getMatches();
      if (res && res.success) {
        set({ matches: res.data || [] });
      }
    } catch (e) {
      console.error('Error fetching matches in store:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchConnectionRequests: async () => {
    try {
      set({ isLoading: true });
      const res = await matchApi.getConnectionRequests();
      if (res && res.success) {
        set({ connectionRequests: res.data || [] });
      }
    } catch (e) {
      console.error('Error fetching connection requests in store:', e);
    } finally {
      set({ isLoading: false });
    }
  },
}));

/**
 * User Store - Manages available users for discovery, nearby, and group creation
 * Replace mock users with real API data by calling initializeUsers()
 */

import { create } from 'zustand';
import { User } from '@/types';

interface UserState {
  availableUsers: User[];
  nearbyUsers: User[];
  allUsers: User[];
  loadingUsers: boolean;
  initializeUsers: (users: User[]) => void;
  setNearbyUsers: (users: User[]) => void;
  searchUsers: (query: string) => User[];
  filterUsersByDomain: (domain: string) => User[];
}

export const useUserStore = create<UserState>((set, get) => ({
  availableUsers: [],
  nearbyUsers: [],
  allUsers: [],
  loadingUsers: false,

  initializeUsers: (users: User[]) => {
    set({
      allUsers: users,
      availableUsers: users,
      loadingUsers: false,
    });
  },

  setNearbyUsers: (users: User[]) => {
    set({ nearbyUsers: users });
  },

  searchUsers: (query: string) => {
    const { allUsers } = get();
    const lower = query.toLowerCase();
    return allUsers.filter(u =>
      (u.name?.toLowerCase().includes(lower)) ||
      (u.anonymousName?.toLowerCase().includes(lower)) ||
      (u.email?.toLowerCase().includes(lower))
    );
  },

  filterUsersByDomain: (domain: string) => {
    const { allUsers } = get();
    return allUsers.filter(u => u.email?.endsWith(`@${domain}`));
  },
}));

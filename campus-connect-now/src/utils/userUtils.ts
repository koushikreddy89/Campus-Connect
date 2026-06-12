/**
 * Real User Utilities
 * Get current authenticated user ID instead of using 'me'
 */

import { useAuthStore } from '@/store/authStore';

/**
 * Get current authenticated user ID
 * Falls back to authStore email if ID not available
 */
export const getCurrentUserId = (): string => {
  const email = useAuthStore.getState().email;
  return email || 'anonymous';
};

/**
 * Get current authenticated user email
 */
export const getCurrentUserEmail = (): string | null => {
  return useAuthStore.getState().email;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return useAuthStore.getState().isAuthenticated;
};

/**
 * Check if current user is the message/content author
 */
export const isCurrentUser = (userId: string): boolean => {
  const currentEmail = useAuthStore.getState().email;
  return userId === currentEmail || userId === 'me';
};

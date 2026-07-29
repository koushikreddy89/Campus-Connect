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

/**
 * Determine message ownership dynamically based on currently authenticated user IDs
 */
export const isOwnMessage = (senderId: string | null | undefined): boolean => {
  if (!senderId) return false;
  const state = useAuthStore.getState();
  const currentUid = state.uid;
  const currentOid = state._id;
  const currentUserId = state.user?.id || state.user?.userId;
  const currentUserOid = state.user?._id;

  const senderStr = String(senderId);
  return !!(
    (currentUid && senderStr === String(currentUid)) ||
    (currentOid && senderStr === String(currentOid)) ||
    (currentUserId && senderStr === String(currentUserId)) ||
    (currentUserOid && senderStr === String(currentUserOid))
  );
};


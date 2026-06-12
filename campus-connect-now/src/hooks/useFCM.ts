/**
 * Stubbed Notification and FCM Hooks (Firebase completely removed)
 */

import { useState } from 'react';

interface UseFCMOptions {
  userId?: string;
  backendUrl?: string;
  autoSetup?: boolean;
}

interface UseFCMResult {
  permission: NotificationPermission | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  retrySetup: () => Promise<void>;
}

export const useFCM = (options: UseFCMOptions = {}): UseFCMResult => {
  const retrySetup = async () => {
    // No-op
  };

  return {
    permission: 'denied',
    token: null,
    loading: false,
    error: null,
    retrySetup
  };
};

export const useNotificationPermission = () => {
  const [permission] = useState<NotificationPermission>('denied');
  const [loading] = useState(false);

  const requestPermission = async () => {
    return 'denied' as NotificationPermission;
  };

  return { permission, loading, requestPermission };
};
